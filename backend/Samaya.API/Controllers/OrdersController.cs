using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Samaya.API.Data;
using Samaya.API.Helpers;
using Samaya.API.Models;
using Samaya.API.Services;

namespace Samaya.API.Controllers
{
    [ApiController]
    [Route("api/orders")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
    public class OrdersController : ControllerBase
    {
        private readonly SamayaDbContext _context;
        private readonly RecipeStockService _recipeStockService;

        public OrdersController(SamayaDbContext context, RecipeStockService recipeStockService)
        {
            _context = context;
            _recipeStockService = recipeStockService;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string? status = null, [FromQuery] int? branchId = null, [FromQuery] string? saleType = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var query = _context.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .Include(o => o.Waiter)
                .Include(o => o.KOTs)
                .Where(o => o.OrganizationId == orgId.Value);

            if (AuthorizationHelper.IsBranchUser(User))
            {
                var userBranchId = AuthorizationHelper.GetBranchId(User);
                if (!userBranchId.HasValue) return Forbid();
                query = query.Where(o => o.BranchId == userBranchId.Value);
            }
            else if (branchId.HasValue)
            {
                query = query.Where(o => o.BranchId == branchId.Value);
            }

            if (!string.IsNullOrWhiteSpace(saleType))
            {
                query = query.Where(o => o.SaleType.ToLower() == saleType.Trim().ToLower());
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                if (status.Equals("active", StringComparison.OrdinalIgnoreCase) || status.Equals("open", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(o => o.Status != "Closed" && o.Status != "Cancelled");
                }
                else
                {
                    query = query.Where(o => o.Status == status);
                }
            }

            var orders = await query
                .OrderByDescending(o => o.CreatedAt)
                .Take(200)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.TableNumber,
                    o.CustomerName,
                    o.BranchId,
                    o.Status,
                    saleType = o.SaleType ?? "TABLE_SERVICE",
                    subtotal = o.Subtotal > 0 ? o.Subtotal : o.Items.Sum(i => i.LineTotal),
                    tax = o.Tax > 0 ? o.Tax : Math.Round(o.Items.Sum(i => i.LineTotal) * 0.05m, 2),
                    discount = o.Discount,
                    totalAmount = o.TotalAmount > 0 ? o.TotalAmount : Math.Round(o.Items.Sum(i => i.LineTotal) * 1.05m, 2),
                    o.CreatedAt,
                    o.ReadyAt,
                    o.ServedAt,
                    o.ClosedAt,
                    waiterId = o.WaiterId,
                    waiterName = o.Waiter != null ? o.Waiter.Name : "Waiter",
                    kotCount = o.KOTs.Count,
                    itemsCount = o.Items.Sum(i => (int)i.Quantity),
                    items = o.Items.Select(i => new
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

            return Ok(orders);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var order = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .Include(o => o.Waiter)
                .Include(o => o.Branch)
                .Include(o => o.KOTs)
                    .ThenInclude(k => k.Items)
                .FirstOrDefaultAsync(o => o.Id == id && o.OrganizationId == orgId.Value);

            if (order == null) return NotFound(new { message = "Order not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, order.BranchId))
                return Forbid();

            var bill = await _context.Bills.AsNoTracking().FirstOrDefaultAsync(b => b.OrderId == order.Id);

            var subtotal = order.Subtotal > 0 ? order.Subtotal : order.Items.Sum(i => i.LineTotal);
            var tax = order.Tax > 0 ? order.Tax : Math.Round(subtotal * 0.05m, 2);
            var total = order.TotalAmount > 0 ? order.TotalAmount : (subtotal + tax - order.Discount);

            return Ok(new
            {
                order.Id,
                order.OrderNumber,
                tableNumber = order.TableNumber ?? "—",
                customerName = order.CustomerName ?? "Guest",
                waiterId = order.WaiterId,
                waiterName = order.Waiter?.Name ?? "Waiter",
                branchId = order.BranchId,
                branchName = order.Branch?.Name ?? "—",
                saleType = order.SaleType ?? "TABLE_SERVICE",
                order.Status,
                subtotal,
                cgst = Math.Round(tax / 2, 2),
                sgst = Math.Round(tax / 2, 2),
                tax,
                discount = order.Discount,
                totalAmount = total,
                order.CreatedAt,
                order.ReadyAt,
                order.ServedAt,
                order.ClosedAt,
                items = order.Items.Select(i => new
                {
                    i.Id,
                    i.MenuItemId,
                    i.MenuItemName,
                    i.Quantity,
                    i.UnitPrice,
                    i.LineTotal,
                    i.KOTId,
                    i.KOTNumber
                }),
                kots = order.KOTs.OrderBy(k => k.CreatedAt).Select(k => new
                {
                    k.Id,
                    k.KOTNumber,
                    k.Status,
                    k.CreatedAt,
                    k.ReadyAt,
                    items = k.Items.Select(i => new
                    {
                        i.Id,
                        i.MenuItemId,
                        i.MenuItemName,
                        i.Quantity,
                        i.UnitPrice,
                        i.LineTotal
                    })
                }),
                bill = bill == null ? null : new
                {
                    bill.Id,
                    bill.BillNumber,
                    bill.Subtotal,
                    bill.Tax,
                    bill.Discount,
                    bill.GrandTotal,
                    bill.PaymentStatus,
                    bill.PaymentMethod,
                    bill.GeneratedAt,
                    bill.PaidAt
                }
            });
        }

        [HttpGet("tables")]
        public async Task<IActionResult> GetTables([FromQuery] int? branchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var activeBranchId = AuthorizationHelper.IsBranchUser(User) ? AuthorizationHelper.GetBranchId(User) : branchId;
            if (!activeBranchId.HasValue)
            {
                var firstBranch = await _context.Branches.FirstOrDefaultAsync(b => b.OrganizationId == orgId.Value && b.IsActive);
                if (firstBranch != null) activeBranchId = firstBranch.Id;
                else return BadRequest(new { message = "Branch is required." });
            }

            var activeBranch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == activeBranchId.Value && b.OrganizationId == orgId.Value);
            if (activeBranch?.ModuleType == "KMS Only")
            {
                return Ok(new List<object>());
            }

            // Active open orders (not Closed and not Cancelled)
            var activeOrders = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .Include(o => o.Waiter)
                .Where(o => o.OrganizationId == orgId.Value && o.BranchId == activeBranchId.Value && o.Status != "Closed" && o.Status != "Cancelled")
                .ToListAsync();

            // Default tables T01 - T16
            var standardTables = Enumerable.Range(1, 16).Select(i => $"T{i:D2}").ToList();

            // Include any additional custom active table names
            var customTables = activeOrders
                .Where(o => !string.IsNullOrWhiteSpace(o.TableNumber) && !standardTables.Contains(o.TableNumber.Trim(), StringComparer.OrdinalIgnoreCase))
                .Select(o => o.TableNumber!.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var allTables = standardTables.Concat(customTables).ToList();

            var result = allTables.Select(t =>
            {
                var order = activeOrders.FirstOrDefault(o => string.Equals(o.TableNumber?.Trim(), t, StringComparison.OrdinalIgnoreCase));
                var isOccupied = order != null;
                var isReadyForBilling = order?.Status == "Ready for Billing";
                return new
                {
                    tableNumber = t,
                    status = isOccupied ? (isReadyForBilling ? "READY_FOR_BILLING" : "OCCUPIED") : "AVAILABLE",
                    isOccupied,
                    isReadyForBilling,
                    activeOrder = order == null ? null : new
                    {
                        id = order.Id,
                        orderNumber = order.OrderNumber,
                        customerName = order.CustomerName ?? "Guest",
                        waiterId = order.WaiterId,
                        waiterName = order.Waiter?.Name ?? "Waiter",
                        status = order.Status,
                        isReadyForBilling,
                        itemsCount = order.Items.Sum(i => (int)i.Quantity),
                        subtotal = order.Subtotal > 0 ? order.Subtotal : order.Items.Sum(i => i.LineTotal),
                        tax = order.Tax > 0 ? order.Tax : Math.Round(order.Items.Sum(i => i.LineTotal) * 0.05m, 2),
                        cgst = Math.Round((order.Tax > 0 ? order.Tax : Math.Round(order.Items.Sum(i => i.LineTotal) * 0.05m, 2)) / 2, 2),
                        sgst = Math.Round((order.Tax > 0 ? order.Tax : Math.Round(order.Items.Sum(i => i.LineTotal) * 0.05m, 2)) / 2, 2),
                        discount = order.Discount,
                        total = order.TotalAmount > 0 ? order.TotalAmount : Math.Round(order.Items.Sum(i => i.LineTotal) * 1.05m, 2),
                        totalAmount = order.TotalAmount > 0 ? order.TotalAmount : Math.Round(order.Items.Sum(i => i.LineTotal) * 1.05m, 2),
                        createdAt = order.CreatedAt,
                        closedAt = order.ClosedAt,
                        items = order.Items.Select(i => new
                        {
                            id = i.Id,
                            menuItemId = i.MenuItemId,
                            menuItemName = i.MenuItemName,
                            quantity = i.Quantity,
                            unitPrice = i.UnitPrice,
                            lineTotal = i.LineTotal
                        }).ToList()
                    }
                };
            });

            return Ok(result);
        }

        [HttpPost]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
        public async Task<IActionResult> Create(CreateOrderRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var waiterId = GetUserId();
            if (orgId == null || waiterId == null) return Unauthorized();

            var branchId = AuthorizationHelper.IsBranchUser(User) ? AuthorizationHelper.GetBranchId(User) : request.BranchId;
            if (!branchId.HasValue) return BadRequest(new { message = "Branch is required." });
            if (request.Items.Count == 0) return BadRequest(new { message = "Add at least one food item." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId && b.OrganizationId == orgId && b.IsActive);
            if (branch == null) return BadRequest(new { message = "Invalid branch." });

            if (branch.ModuleType == "KMS Only")
            {
                return BadRequest(new { message = "POS order taking and billing are disabled for KMS Only branches." });
            }

            bool isPosOnly = branch.ModuleType == "POS Only";

            var isCounter = string.Equals(request.SaleType, "SELF_SERVICE", StringComparison.OrdinalIgnoreCase)
                || string.Equals(request.SaleType, "COUNTER", StringComparison.OrdinalIgnoreCase);

            string? tableNum = isCounter
                ? (string.IsNullOrWhiteSpace(request.TableNumber) ? null : request.TableNumber.Trim().ToUpper())
                : (string.IsNullOrWhiteSpace(request.TableNumber) ? "T01" : request.TableNumber.Trim().ToUpper());

            // Validation (Section 16): Cannot create two active open orders for the same occupied table (Only applies to Table Service)
            if (!isCounter && !string.IsNullOrWhiteSpace(tableNum))
            {
                var isOccupied = await _context.Orders.AnyAsync(o =>
                    o.OrganizationId == orgId.Value &&
                    o.BranchId == branchId.Value &&
                    o.TableNumber == tableNum &&
                    o.Status != "Closed" &&
                    o.Status != "Cancelled");

                if (isOccupied)
                {
                    return BadRequest(new { message = $"Table {tableNum} is currently OCCUPIED with an active open order. Please extend the existing order instead." });
                }
            }

            var menuIds = request.Items.Select(i => i.MenuItemId).Distinct().ToList();
            var menus = await _context.MenuItems
                .Where(m => menuIds.Contains(m.Id) && m.OrganizationId == orgId && m.BranchId == branchId && m.IsActive)
                .ToDictionaryAsync(m => m.Id);

            if (menus.Count != menuIds.Count)
                return BadRequest(new { message = "One or more menu items are invalid for this branch." });

            // Validate Kitchen Stock availability for recipe ingredients before creating order (Only for non-POS-Only branches)
            var foodItemsToDeduct = request.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
            RecipeStockValidationResult? stockValidation = null;
            bool hasInsufficientStock = false;

            if (!isPosOnly)
            {
                stockValidation = await _recipeStockService.ValidateRecipeStockAsync(
                    orgId.Value,
                    branchId.Value,
                    "Main Kitchen",
                    foodItemsToDeduct,
                    requireRecipe: false);

                hasInsufficientStock = !stockValidation.IsSufficient;
            }

            // Generate clean Order Number (e.g. ORD-1025)
            string orderNumber;
            if (!string.IsNullOrWhiteSpace(request.OrderNumber))
            {
                orderNumber = request.OrderNumber.Trim().ToUpper();
                if (await _context.Orders.AnyAsync(o => o.OrderNumber == orderNumber && o.OrganizationId == orgId.Value))
                {
                    return BadRequest(new { message = $"Order number {orderNumber} already exists." });
                }
            }
            else
            {
                var totalCount = await _context.Orders.CountAsync(o => o.OrganizationId == orgId.Value);
                orderNumber = $"ORD-{1020 + totalCount + 1}";
                if (await _context.Orders.AnyAsync(o => o.OrderNumber == orderNumber && o.OrganizationId == orgId.Value))
                {
                    orderNumber = $"ORD-{DateTime.UtcNow:yyMMdd}-{Random.Shared.Next(100, 999)}";
                }
            }

            var customer = string.IsNullOrWhiteSpace(request.CustomerName) ? (isCounter ? "Counter Customer" : "Guest") : request.CustomerName.Trim();

            var order = new Order
            {
                OrganizationId = orgId.Value,
                BranchId = branchId.Value,
                WaiterId = waiterId.Value,
                TableNumber = tableNum,
                CustomerName = customer,
                OrderNumber = orderNumber,
                SaleType = isCounter ? "SELF_SERVICE" : "TABLE_SERVICE",
                Status = "Open",
                CreatedAt = DateTime.UtcNow
            };

            // Section 2: Validate against today's Daily Production Plan
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var todayPlans = await _context.ProductionPlans
                .Include(p => p.Items)
                .Where(p => p.OrganizationId == orgId.Value &&
                            p.BranchId == branchId.Value &&
                            p.PlanDate >= todayStart && p.PlanDate < todayEnd &&
                            p.Status != "CANCELLED")
                .OrderByDescending(p => p.Id)
                .ToListAsync();

            if (!isPosOnly && todayPlans.Count > 0)
            {
                foreach (var line in request.Items)
                {
                    var menu = menus[line.MenuItemId];
                    var matchingPlanItems = todayPlans
                        .SelectMany(p => p.Items)
                        .Where(pi => pi.MenuItemId == line.MenuItemId)
                        .ToList();

                    if (matchingPlanItems.Count > 0)
                    {
                        var toDeduct = (decimal)line.Quantity;
                        foreach (var pi in matchingPlanItems)
                        {
                            var canDeduct = Math.Min(toDeduct, Math.Max(0, pi.PlannedQuantity - pi.ActualSales));
                            if (canDeduct > 0)
                            {
                                pi.ActualSales += canDeduct;
                                pi.OrderedQuantity = pi.ActualSales;
                                pi.RemainingQuantity = Math.Max(0, pi.PlannedQuantity - pi.ActualSales);
                                pi.Status = pi.RemainingQuantity <= 0 ? "Completed / Fully Allocated" : (pi.ActualSales > 0 ? "In Progress" : "Planned");
                                pi.UnsoldQuantity = Math.Max(0, pi.ActualQuantity - pi.ActualSales);
                                toDeduct -= canDeduct;
                            }
                            if (toDeduct <= 0) break;
                        }
                    }
                }
            }

            foreach (var line in request.Items)
            {
                if (line.Quantity <= 0) return BadRequest(new { message = "Quantity must be greater than zero." });
                var menu = menus[line.MenuItemId];
                order.Items.Add(new OrderItem
                {
                    MenuItemId = menu.Id,
                    MenuItemName = menu.Name,
                    Quantity = line.Quantity,
                    UnitPrice = menu.Price,
                    LineTotal = menu.Price * line.Quantity,
                    CreatedAt = DateTime.UtcNow
                });
            }

            order.Subtotal = order.Items.Sum(i => i.LineTotal);
            order.Tax = Math.Round(order.Subtotal * 0.05m, 2); // 5% GST
            order.TotalAmount = order.Subtotal + order.Tax;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // Generate Kitchen Ticket (KOT) for both regular and POS Only branches so food orders appear on KDS
                var kotSeq = (await _context.KOTs.CountAsync(k => k.OrganizationId == orgId.Value && k.CreatedAt.Date == DateTime.UtcNow.Date)) + 1;
                var kot = new KOT
                {
                    OrganizationId = orgId.Value,
                    BranchId = branchId.Value,
                    OrderId = order.Id,
                    KOTNumber = isCounter ? $"KOT-C{kotSeq:D3}" : "KOT-001",
                    TableNumber = order.TableNumber,
                    CustomerName = order.CustomerName,
                    WaiterId = waiterId.Value,
                    SaleType = order.SaleType,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };
                _context.KOTs.Add(kot);
                await _context.SaveChangesAsync();

                // Tag items with initial KOT
                foreach (var item in order.Items)
                {
                    item.KOTId = kot.Id;
                    item.KOTNumber = kot.KOTNumber;
                }
                await _context.SaveChangesAsync();

                if (!isPosOnly)
                {
                    if (!hasInsufficientStock)
                    {
                        // Deduct Recipe Ingredients from Kitchen Stock atomically when stock is sufficient
                        var deductionResult = await _recipeStockService.DeductRecipeStockAsync(
                            orgId.Value,
                            branchId.Value,
                            "Main Kitchen",
                            foodItemsToDeduct,
                            waiterId.Value,
                            order.OrderNumber,
                            "ORDER",
                            order.Id.ToString(),
                            existingTransaction: transaction,
                            requireRecipe: false);

                        if (deductionResult.Success)
                        {
                            order.InventoryApplied = true;
                        }
                        else
                        {
                            order.InventoryApplied = false;
                            hasInsufficientStock = true;
                        }
                    }
                    else
                    {
                        // Order allowed with insufficient stock: do not deduct unavailable stock to prevent negative inventory
                        order.InventoryApplied = false;
                    }

                    await _context.SaveChangesAsync();
                }
                else
                {
                    order.InventoryApplied = false;
                }

                await transaction.CommitAsync();

                string responseMessage = isPosOnly
                    ? $"Order created and {kot.KOTNumber} sent to kitchen."
                    : (hasInsufficientStock
                        ? $"Order created with Insufficient Stock alert and {kot.KOTNumber} sent to kitchen."
                        : $"Order created and {kot.KOTNumber} sent to kitchen.");

                return Ok(new
                {
                    message = responseMessage,
                    id = order.Id,
                    orderId = order.Id,
                    orderNumber = order.OrderNumber,
                    tableNumber = order.TableNumber ?? "Counter",
                    customerName = order.CustomerName,
                    saleType = order.SaleType,
                    status = order.Status,
                    kotNumber = kot.KOTNumber,
                    subtotal = order.Subtotal,
                    tax = order.Tax,
                    totalAmount = order.TotalAmount,
                    inventoryDeducted = isPosOnly ? false : order.InventoryApplied,
                    insufficientStock = isPosOnly ? false : hasInsufficientStock,
                    shortages = (!isPosOnly && hasInsufficientStock && stockValidation != null) ? stockValidation.Shortages : new List<RecipeStockShortageDetail>(),
                    deductedIngredients = (!isPosOnly && order.InventoryApplied && stockValidation != null) ? stockValidation.Requirements.Select(r => new
                    {
                        r.ItemName,
                        r.FormattedRequired,
                        r.FormattedAvailable
                    }) : Enumerable.Empty<object>()
                });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPost("counter-sale")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
        public async Task<IActionResult> CounterSale([FromBody] CounterSaleRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var branchId = AuthorizationHelper.IsBranchUser(User) ? AuthorizationHelper.GetBranchId(User) : request.BranchId;
            if (!branchId.HasValue) return BadRequest(new { message = "Branch is required." });
            if (request.Items == null || request.Items.Count == 0) return BadRequest(new { message = "Add at least one food item to the order." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId && b.OrganizationId == orgId && b.IsActive);
            if (branch == null) return BadRequest(new { message = "Invalid or inactive branch." });

            if (branch.ModuleType == "KMS Only")
            {
                return BadRequest(new { message = "POS order taking and billing are disabled for KMS Only branches." });
            }

            bool isPosOnly = branch.ModuleType == "POS Only";

            var menuIds = request.Items.Select(i => i.MenuItemId).Distinct().ToList();
            var menus = await _context.MenuItems
                .Where(m => menuIds.Contains(m.Id) && m.OrganizationId == orgId && m.BranchId == branchId && m.IsActive)
                .ToDictionaryAsync(m => m.Id);

            if (menus.Count != menuIds.Count)
                return BadRequest(new { message = "One or more menu items are invalid for this branch." });

            // Validate Kitchen Stock availability for recipe ingredients before creating order (Only for non-POS-Only branches)
            var foodItemsToDeduct = request.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
            RecipeStockValidationResult? stockValidation = null;
            bool hasInsufficientStock = false;

            if (!isPosOnly)
            {
                stockValidation = await _recipeStockService.ValidateRecipeStockAsync(
                    orgId.Value,
                    branchId.Value,
                    "Main Kitchen",
                    foodItemsToDeduct,
                    requireRecipe: false);

                hasInsufficientStock = !stockValidation.IsSufficient;
            }

            // Generate clean Order Number (e.g. ORD-1025)
            var totalOrdersCount = await _context.Orders.CountAsync(o => o.OrganizationId == orgId.Value);
            string orderNumber;
            int ordAttempt = 0;
            do
            {
                orderNumber = $"ORD-{1020 + totalOrdersCount + 1 + ordAttempt}";
                ordAttempt++;
            } while (await _context.Orders.AnyAsync(o => o.OrganizationId == orgId.Value && o.OrderNumber == orderNumber));

            var customer = string.IsNullOrWhiteSpace(request.CustomerName) ? "Counter Customer" : request.CustomerName.Trim();

            var order = new Order
            {
                OrganizationId = orgId.Value,
                BranchId = branchId.Value,
                WaiterId = userId.Value,
                TableNumber = null, // No fake table number per Requirement #8
                CustomerName = customer,
                OrderNumber = orderNumber,
                SaleType = "SELF_SERVICE",
                Status = "Closed",
                CreatedAt = DateTime.UtcNow,
                ClosedAt = DateTime.UtcNow
            };

            // Section 2 / Requirement #11: Validate against today's Daily Production Plan if scheduled
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var todayPlans = await _context.ProductionPlans
                .Include(p => p.Items)
                .Where(p => p.OrganizationId == orgId.Value &&
                            p.BranchId == branchId.Value &&
                            p.PlanDate >= todayStart && p.PlanDate < todayEnd &&
                            p.Status != "CANCELLED")
                .OrderByDescending(p => p.Id)
                .ToListAsync();

            if (!isPosOnly && todayPlans.Count > 0)
            {
                foreach (var line in request.Items)
                {
                    var menu = menus[line.MenuItemId];
                    var matchingPlanItems = todayPlans
                        .SelectMany(p => p.Items)
                        .Where(pi => pi.MenuItemId == line.MenuItemId)
                        .ToList();

                    if (matchingPlanItems.Count > 0)
                    {
                        var toDeduct = (decimal)line.Quantity;
                        foreach (var pi in matchingPlanItems)
                        {
                            var canDeduct = Math.Min(toDeduct, Math.Max(0, pi.PlannedQuantity - pi.ActualSales));
                            if (canDeduct > 0)
                            {
                                pi.ActualSales += canDeduct;
                                pi.OrderedQuantity = pi.ActualSales;
                                pi.RemainingQuantity = Math.Max(0, pi.PlannedQuantity - pi.ActualSales);
                                pi.Status = pi.RemainingQuantity <= 0 ? "Completed / Fully Allocated" : (pi.ActualSales > 0 ? "In Progress" : "Planned");
                                pi.UnsoldQuantity = Math.Max(0, pi.ActualQuantity - pi.ActualSales);
                                toDeduct -= canDeduct;
                            }
                            if (toDeduct <= 0) break;
                        }
                    }
                }
            }

            foreach (var line in request.Items)
            {
                if (line.Quantity <= 0) return BadRequest(new { message = "Quantity must be greater than zero." });
                var menu = menus[line.MenuItemId];
                order.Items.Add(new OrderItem
                {
                    MenuItemId = menu.Id,
                    MenuItemName = menu.Name,
                    Quantity = line.Quantity,
                    UnitPrice = menu.Price,
                    LineTotal = menu.Price * line.Quantity,
                    CreatedAt = DateTime.UtcNow
                });
            }

            order.Subtotal = order.Items.Sum(i => i.LineTotal);
            var discount = Math.Max(0, request.Discount ?? 0m);
            order.Discount = Math.Min(order.Subtotal, discount);
            order.Tax = Math.Round(Math.Max(0, order.Subtotal - order.Discount) * 0.05m, 2); // 5% GST
            order.TotalAmount = Math.Max(0, order.Subtotal - order.Discount) + order.Tax;

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.Orders.Add(order);
                await _context.SaveChangesAsync();

                // Requirement #9: Automatically generate Kitchen Ticket (KOT) for both regular and POS Only branches
                var kotSeq = (await _context.KOTs.CountAsync(k => k.OrganizationId == orgId.Value && k.CreatedAt.Date == DateTime.UtcNow.Date)) + 1;
                var kot = new KOT
                {
                    OrganizationId = orgId.Value,
                    BranchId = branchId.Value,
                    OrderId = order.Id,
                    KOTNumber = $"KOT-C{kotSeq:D3}",
                    TableNumber = null,
                    CustomerName = order.CustomerName,
                    WaiterId = userId.Value,
                    SaleType = "SELF_SERVICE",
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };
                _context.KOTs.Add(kot);
                await _context.SaveChangesAsync();

                foreach (var item in order.Items)
                {
                    item.KOTId = kot.Id;
                    item.KOTNumber = kot.KOTNumber;
                }
                await _context.SaveChangesAsync();

                // Requirement #5, #6, #7, #14: Generate unique Bill with payment details
                var billSeq = (await _context.Bills.CountAsync(b => b.OrganizationId == orgId.Value && b.GeneratedAt.Year == DateTime.UtcNow.Year)) + 1;
                string billNumber;
                int bAttempt = 0;
                do
                {
                    billNumber = !string.IsNullOrWhiteSpace(branch.Code)
                        ? $"BILL-{branch.Code}-{DateTime.UtcNow.Year}-{(billSeq + bAttempt):D4}"
                        : $"BILL-{DateTime.UtcNow.Year}-{(billSeq + bAttempt):D4}";
                    bAttempt++;
                } while (await _context.Bills.AnyAsync(b => b.BillNumber == billNumber));

                var paymentMethod = string.IsNullOrWhiteSpace(request.PaymentMethod) ? "Cash" : request.PaymentMethod.Trim();
                var tendered = request.AmountTendered ?? order.TotalAmount;
                var change = paymentMethod.Equals("Cash", StringComparison.OrdinalIgnoreCase) ? Math.Max(0, tendered - order.TotalAmount) : 0m;

                var bill = new Bill
                {
                    OrganizationId = orgId.Value,
                    BranchId = branchId.Value,
                    OrderId = order.Id,
                    BillNumber = billNumber,
                    CustomerName = order.CustomerName,
                    TableNumber = null,
                    WaiterId = userId.Value,
                    SaleType = "SELF_SERVICE",
                    Subtotal = order.Subtotal,
                    Discount = order.Discount,
                    Tax = order.Tax,
                    GrandTotal = order.TotalAmount,
                    PaymentStatus = "Paid",
                    PaymentMethod = paymentMethod,
                    AmountTendered = tendered,
                    ChangeGiven = change,
                    GeneratedAt = DateTime.UtcNow,
                    PaidAt = DateTime.UtcNow
                };

                _context.Bills.Add(bill);
                await _context.SaveChangesAsync();

                if (!isPosOnly)
                {
                    if (!hasInsufficientStock)
                    {
                        var deductionResult = await _recipeStockService.DeductRecipeStockAsync(
                            orgId.Value,
                            branchId.Value,
                            "Main Kitchen",
                            foodItemsToDeduct,
                            userId.Value,
                            order.OrderNumber,
                            "COUNTER_SALE",
                            order.Id.ToString(),
                            existingTransaction: transaction,
                            requireRecipe: false);

                        if (deductionResult.Success)
                        {
                            order.InventoryApplied = true;
                        }
                        else
                        {
                            order.InventoryApplied = false;
                            hasInsufficientStock = true;
                        }
                    }
                    else
                    {
                        order.InventoryApplied = false;
                    }

                    await _context.SaveChangesAsync();
                }
                else
                {
                    order.InventoryApplied = false;
                }

                await transaction.CommitAsync();

                var cashierUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId.Value);
                var org = await _context.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == orgId.Value);

                return Ok(new
                {
                    message = "Counter sale completed & bill generated successfully.",
                    bill = new
                    {
                        bill.Id,
                        bill.BillNumber,
                        bill.OrderId,
                        orderNumber = order.OrderNumber,
                        customerName = bill.CustomerName,
                        tableNumber = (string?)null,
                        isCounter = true,
                        saleType = "SELF_SERVICE",
                        cashierId = userId.Value,
                        cashierName = cashierUser?.Name ?? "Cashier",
                        waiterId = userId.Value,
                        waiterName = cashierUser?.Name ?? "Cashier",
                        organizationId = orgId.Value,
                        organizationName = org?.Name ?? "—",
                        branchId = branch.Id,
                        branchName = branch.Name,
                        branchAddress = branch.Address ?? "—",
                        branchCity = branch.City ?? "—",
                        branchPhone = branch.Phone ?? "—",
                        bill.Subtotal,
                        cgst = Math.Round(bill.Tax / 2, 2),
                        sgst = Math.Round(bill.Tax / 2, 2),
                        bill.Tax,
                        bill.Discount,
                        bill.GrandTotal,
                        bill.PaymentStatus,
                        bill.PaymentMethod,
                        bill.AmountTendered,
                        bill.ChangeGiven,
                        bill.GeneratedAt,
                        bill.PaidAt,
                        items = order.Items.Select(i => new
                        {
                            i.Id,
                            i.MenuItemId,
                            i.MenuItemName,
                            i.Quantity,
                            i.UnitPrice,
                            i.LineTotal,
                            kotNumber = kot?.KOTNumber
                        }).ToList()
                    },
                    kot = new
                    {
                        kot.Id,
                        kot.KOTNumber,
                        kot.Status,
                        saleType = "SELF_SERVICE",
                        tableNumber = (string?)null
                    },
                    inventoryDeducted = isPosOnly ? false : order.InventoryApplied,
                    insufficientStock = isPosOnly ? false : hasInsufficientStock
                });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPost("{id:int}/extend")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
        public async Task<IActionResult> ExtendOrder(int id, [FromBody] ExtendOrderRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var waiterId = GetUserId();
            if (orgId == null || waiterId == null) return Unauthorized();

            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.KOTs)
                .FirstOrDefaultAsync(o => o.Id == id && o.OrganizationId == orgId.Value);

            if (order == null) return NotFound(new { message = "Order not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, order.BranchId))
                return Forbid();

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == order.BranchId && b.OrganizationId == orgId.Value);
            if (branch?.ModuleType == "KMS Only")
            {
                return BadRequest(new { message = "POS order operations are disabled for KMS Only branches." });
            }

            bool isPosOnly = branch?.ModuleType == "POS Only";

            // Rule 16: Cannot extend a closed order. Cannot add items after final bill generation.
            if (order.Status == "Closed" || order.Status == "Cancelled")
            {
                return BadRequest(new { message = "Cannot extend order. This order has already been finalized and closed." });
            }

            var billExists = await _context.Bills.AnyAsync(b => b.OrderId == order.Id);
            if (billExists)
            {
                return BadRequest(new { message = "Cannot extend order. Final bill has already been generated." });
            }

            if (request.Items == null || request.Items.Count == 0)
            {
                return BadRequest(new { message = "Select at least one food item to extend the order." });
            }

            var menuIds = request.Items.Select(i => i.MenuItemId).Distinct().ToList();
            var menus = await _context.MenuItems
                .Where(m => menuIds.Contains(m.Id) && m.OrganizationId == orgId && m.BranchId == order.BranchId && m.IsActive)
                .ToDictionaryAsync(m => m.Id);

            if (menus.Count != menuIds.Count)
                return BadRequest(new { message = "One or more menu items are invalid." });

            // Validate Kitchen Stock availability for recipe ingredients before extending order (Only for non-POS-Only branches)
            var foodItemsToDeduct = request.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
            RecipeStockValidationResult? stockValidation = null;
            bool hasInsufficientStock = false;

            if (!isPosOnly)
            {
                stockValidation = await _recipeStockService.ValidateRecipeStockAsync(
                    orgId.Value,
                    order.BranchId,
                    "Main Kitchen",
                    foodItemsToDeduct,
                    requireRecipe: false);

                hasInsufficientStock = !stockValidation.IsSufficient;
            }

            // Validate against today's Daily Production Plan
            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var todayPlans = await _context.ProductionPlans
                .Include(p => p.Items)
                .Where(p => p.OrganizationId == orgId.Value &&
                            p.BranchId == order.BranchId &&
                            p.PlanDate >= todayStart && p.PlanDate < todayEnd &&
                            p.Status != "CANCELLED")
                .OrderByDescending(p => p.Id)
                .ToListAsync();

            if (!isPosOnly && todayPlans.Count > 0)
            {
                foreach (var line in request.Items)
                {
                    var menu = menus[line.MenuItemId];
                    var matchingPlanItems = todayPlans
                        .SelectMany(p => p.Items)
                        .Where(pi => pi.MenuItemId == line.MenuItemId)
                        .ToList();

                    if (matchingPlanItems.Count > 0)
                    {
                        var toDeduct = (decimal)line.Quantity;
                        foreach (var pi in matchingPlanItems)
                        {
                            var canDeduct = Math.Min(toDeduct, Math.Max(0, pi.PlannedQuantity - pi.ActualSales));
                            if (canDeduct > 0)
                            {
                                pi.ActualSales += canDeduct;
                                pi.OrderedQuantity = pi.ActualSales;
                                pi.RemainingQuantity = Math.Max(0, pi.PlannedQuantity - pi.ActualSales);
                                pi.Status = pi.RemainingQuantity <= 0 ? "Completed / Fully Allocated" : (pi.ActualSales > 0 ? "In Progress" : "Planned");
                                pi.UnsoldQuantity = Math.Max(0, pi.ActualQuantity - pi.ActualSales);
                                toDeduct -= canDeduct;
                            }
                            if (toDeduct <= 0) break;
                        }
                    }
                }
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Determine next KOT number (e.g. KOT-002, KOT-003)
                var kotCount = await _context.KOTs.CountAsync(k => k.OrderId == order.Id);
                var nextKotNumber = $"KOT-{kotCount + 1:D3}";

                var newKot = new KOT
                {
                    OrganizationId = orgId.Value,
                    BranchId = order.BranchId,
                    OrderId = order.Id,
                    KOTNumber = nextKotNumber,
                    TableNumber = order.TableNumber,
                    CustomerName = order.CustomerName,
                    WaiterId = waiterId.Value,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                };

                _context.KOTs.Add(newKot);
                await _context.SaveChangesAsync();

                var addedItems = new List<OrderItem>();
                foreach (var line in request.Items)
                {
                    if (line.Quantity <= 0) return BadRequest(new { message = "Quantity must be greater than zero." });
                    var menu = menus[line.MenuItemId];
                    var orderItem = new OrderItem
                    {
                        OrderId = order.Id,
                        MenuItemId = menu.Id,
                        MenuItemName = menu.Name,
                        Quantity = line.Quantity,
                        UnitPrice = menu.Price,
                        LineTotal = menu.Price * line.Quantity,
                        KOTId = newKot.Id,
                        KOTNumber = newKot.KOTNumber,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.OrderItems.Add(orderItem);
                    addedItems.Add(orderItem);
                }
                await _context.SaveChangesAsync();

                // Update cumulative running total for the same order
                var allItems = await _context.OrderItems.Where(i => i.OrderId == order.Id).ToListAsync();
                order.Subtotal = allItems.Sum(i => i.LineTotal);
                order.Tax = Math.Round(order.Subtotal * 0.05m, 2);
                order.TotalAmount = order.Subtotal + order.Tax - order.Discount;
                order.Status = "Open";

                await _context.SaveChangesAsync();

                if (!isPosOnly)
                {
                    if (!hasInsufficientStock)
                    {
                        var deductionResult = await _recipeStockService.DeductRecipeStockAsync(
                            orgId.Value,
                            order.BranchId,
                            "Main Kitchen",
                            foodItemsToDeduct,
                            waiterId.Value,
                            order.OrderNumber,
                            "ORDER_EXTEND",
                            order.Id.ToString(),
                            existingTransaction: transaction,
                            requireRecipe: false);

                        if (!deductionResult.Success)
                        {
                            order.InventoryApplied = false;
                            hasInsufficientStock = true;
                        }
                    }
                    else
                    {
                        order.InventoryApplied = false;
                    }

                    await _context.SaveChangesAsync();
                }
                else
                {
                    order.InventoryApplied = false;
                }

                await transaction.CommitAsync();

                return Ok(new
                {
                    message = $"Order extended. {newKot.KOTNumber} generated with newly added items.",
                    id = order.Id,
                    orderId = order.Id,
                    orderNumber = order.OrderNumber,
                    tableNumber = order.TableNumber,
                    customerName = order.CustomerName,
                    kotNumber = newKot.KOTNumber,
                    kotId = newKot.Id,
                    runningSubtotal = order.Subtotal,
                    runningTax = order.Tax,
                    runningTotal = order.TotalAmount,
                    totalAmount = order.TotalAmount,
                    newItems = addedItems.Select(i => new
                    {
                        i.Id,
                        i.MenuItemId,
                        i.MenuItemName,
                        i.Quantity,
                        i.UnitPrice,
                        i.LineTotal
                    }),
                    inventoryDeducted = isPosOnly ? false : order.InventoryApplied,
                    insufficientStock = isPosOnly ? false : hasInsufficientStock
                });
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        [HttpPost("{id:int}/close")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
        public async Task<IActionResult> CloseTable(int id, [FromBody] CloseTableRequest? request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var order = await _context.Orders
                .Include(o => o.Items)
                .Include(o => o.Branch)
                .Include(o => o.Waiter)
                .FirstOrDefaultAsync(o => o.Id == id && o.OrganizationId == orgId.Value);

            if (order == null) return NotFound(new { message = "Order not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, order.BranchId))
                return Forbid();

            // Check if already closed
            if (order.Status == "Closed")
            {
                var existingBill = await _context.Bills.FirstOrDefaultAsync(b => b.OrderId == order.Id);
                return Ok(new
                {
                    message = "Table is already closed/billed.",
                    order,
                    bill = existingBill
                });
            }

            if (order.Status == "Ready for Billing")
            {
                return Ok(new
                {
                    message = $"Table {order.TableNumber} is already marked Ready for Billing.",
                    orderId = order.Id,
                    orderNumber = order.OrderNumber,
                    tableNumber = order.TableNumber,
                    status = order.Status
                });
            }

            // Waiter marks table order completed -> Ready for Billing
            order.Status = "Ready for Billing";
            order.ClosedAt = DateTime.UtcNow;

            order.Subtotal = order.Items.Sum(i => i.LineTotal);
            var discount = request?.Discount ?? order.Discount;
            order.Discount = discount;
            order.Tax = Math.Round(Math.Max(0, order.Subtotal - discount) * 0.05m, 2);
            order.TotalAmount = Math.Max(0, order.Subtotal - discount) + order.Tax;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Table {order.TableNumber} order completed. Status is now Ready for Billing.",
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                tableNumber = order.TableNumber,
                customerName = order.CustomerName,
                waiterName = order.Waiter?.Name ?? "Waiter",
                status = order.Status,
                subtotal = order.Subtotal,
                cgst = Math.Round(order.Tax / 2, 2),
                sgst = Math.Round(order.Tax / 2, 2),
                tax = order.Tax,
                discount = order.Discount,
                grandTotal = order.TotalAmount,
                totalAmount = order.TotalAmount,
                closedAt = order.ClosedAt
            });
        }

        [HttpPost("{id:int}/status")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
        public async Task<IActionResult> UpdateStatus(int id, UpdateOrderStatusRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var userId = GetUserId();
            if (orgId == null || userId == null) return Unauthorized();

            var order = await _context.Orders.Include(o => o.Items).FirstOrDefaultAsync(o => o.Id == id && o.OrganizationId == orgId.Value);
            if (order == null) return NotFound(new { message = "Order not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, order.BranchId))
                return Forbid();

            var role = AuthorizationHelper.GetRole(User);
            if (role == "Waiter" && order.WaiterId != userId.Value) return Forbid();

            var next = request.Status?.Trim();
            if (string.Equals(next, "Picked Up", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(next, "PickedUp", StringComparison.OrdinalIgnoreCase))
            {
                next = "Served";
            }

            if (role == "Waiter" && next != "Served" && next != "Closed") return Forbid();
            if ((role == "Chef" || role == "Kitchen Manager") && next is not ("Preparing" or "Ready" or "Served")) return Forbid();
            if ((role == "Cashier" || role == "Accountant") && next != "Cancelled" && next != "Closed" && next != "Served") return Forbid();

            if (next is not ("Open" or "Preparing" or "Ready" or "Served" or "Closed" or "Cancelled"))
                return BadRequest(new { message = "Invalid order status." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == order.BranchId && b.OrganizationId == orgId.Value);
            bool isPosOnly = branch?.ModuleType == "POS Only";

            if (next == "Ready")
            {
                if (!isPosOnly)
                {
                    order.InventoryApplied = true;
                }
                order.ReadyAt = DateTime.UtcNow;
            }

            if (next == "Cancelled" && order.Status != "Cancelled")
            {
                // Restore recipe ingredients to Kitchen Stock if inventory was deducted
                if (order.InventoryApplied)
                {
                    var itemsToRestore = order.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
                    await _recipeStockService.RestoreRecipeStockAsync(
                        orgId.Value,
                        order.BranchId,
                        "Main Kitchen",
                        itemsToRestore,
                        userId.Value,
                        order.OrderNumber,
                        "ORDER_CANCEL",
                        order.Id.ToString()
                    );
                    order.InventoryApplied = false;
                }

                var planDate = order.CreatedAt.Date;
                var planDateNext = planDate.AddDays(1);
                var planItems = await _context.ProductionPlanItems
                    .Include(pi => pi.ProductionPlan)
                    .Where(pi => pi.ProductionPlan!.OrganizationId == orgId.Value &&
                                 pi.ProductionPlan.BranchId == order.BranchId &&
                                 pi.ProductionPlan.PlanDate >= planDate && pi.ProductionPlan.PlanDate < planDateNext &&
                                 pi.ProductionPlan.Status != "CANCELLED")
                    .ToListAsync();

                foreach (var oi in order.Items)
                {
                    var pi = planItems.FirstOrDefault(p => p.MenuItemId == oi.MenuItemId);
                    if (pi != null)
                    {
                        pi.ActualSales = Math.Max(0, pi.ActualSales - oi.Quantity);
                        var rem = pi.PlannedQuantity - pi.ActualSales;
                        pi.Status = rem <= 0 ? "Completed / Fully Allocated" : (pi.ActualSales > 0 ? "In Progress" : "Planned");
                        pi.UnsoldQuantity = Math.Max(0, pi.ActualQuantity - pi.ActualSales);
                    }
                }
            }

            order.Status = next;
            if (next == "Served") order.ServedAt = DateTime.UtcNow;
            if (next == "Closed") order.ClosedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return Ok(new { message = $"Order marked {next}.", order.Status, inventoryApplied = order.InventoryApplied });
        }

        [HttpGet("availability")]
        public async Task<IActionResult> GetDishAvailability([FromQuery] int? branchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var targetBranchId = AuthorizationHelper.IsBranchUser(User) ? AuthorizationHelper.GetBranchId(User) : branchId;
            if (!targetBranchId.HasValue) return BadRequest(new { message = "Branch is required." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == targetBranchId.Value && b.OrganizationId == orgId.Value);
            if (branch?.ModuleType == "POS Only")
            {
                return Ok(new { hasPlan = false, items = new List<object>() });
            }

            var todayStart = DateTime.UtcNow.Date;
            var todayEnd = todayStart.AddDays(1);

            var todayPlans = await _context.ProductionPlans
                .AsNoTracking()
                .Include(p => p.Items)
                .Where(p => p.OrganizationId == orgId.Value &&
                            p.BranchId == targetBranchId.Value &&
                            p.PlanDate >= todayStart && p.PlanDate < todayEnd &&
                            p.Status != "CANCELLED")
                .ToListAsync();

            if (todayPlans.Count == 0)
            {
                return Ok(new { hasPlan = false, items = new List<object>() });
            }

            var items = todayPlans.SelectMany(p => p.Items)
                .GroupBy(i => i.MenuItemId)
                .Select(g =>
                {
                    var planned = g.Sum(x => x.PlannedQuantity);
                    var ordered = g.Sum(x => x.ActualSales);
                    var produced = g.Sum(x => x.ActualQuantity);
                    var remaining = Math.Max(0, planned - ordered);
                    return new
                    {
                        menuItemId = g.Key,
                        plannedQuantity = planned,
                        orderedQuantity = ordered,
                        producedQuantity = produced,
                        remainingQuantity = remaining,
                        isAvailable = remaining > 0,
                        status = remaining <= 0 ? "Completed / Fully Allocated" : (ordered > 0 ? "In Progress" : "Planned")
                    };
                }).ToList();

            return Ok(new { hasPlan = true, items });
        }

        [HttpGet("waiter/ready")]
        [Authorize(Roles = "Waiter")]
        public async Task<IActionResult> ReadyForWaiter()
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            var waiterId = GetUserId();
            if (orgId == null || waiterId == null) return Unauthorized();

            var branchId = AuthorizationHelper.GetBranchId(User);
            if (!branchId.HasValue) return Forbid();

            var ready = await _context.Orders
                .AsNoTracking()
                .Include(o => o.Items)
                .Where(o => o.OrganizationId == orgId.Value && o.BranchId == branchId.Value && o.WaiterId == waiterId.Value && o.Status == "Ready")
                .OrderByDescending(o => o.ReadyAt)
                .Select(o => new
                {
                    o.Id,
                    o.OrderNumber,
                    o.TableNumber,
                    o.CustomerName,
                    o.ReadyAt,
                    items = o.Items.Select(i => new { i.MenuItemName, i.Quantity })
                })
                .ToListAsync();

            return Ok(ready);
        }

        [HttpPost("check-stock")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
        public async Task<IActionResult> CheckStock([FromBody] CheckOrderStockRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var branchId = AuthorizationHelper.IsBranchUser(User) ? AuthorizationHelper.GetBranchId(User) : request.BranchId;
            if (!branchId.HasValue) return BadRequest(new { message = "Branch is required." });

            var branch = await _context.Branches.FirstOrDefaultAsync(b => b.Id == branchId.Value && b.OrganizationId == orgId.Value);
            if (branch?.ModuleType == "KMS Only")
            {
                return BadRequest(new { message = "POS order operations are disabled for KMS Only branches." });
            }
            if (branch?.ModuleType == "POS Only")
            {
                return Ok(new
                {
                    isSufficient = true,
                    message = (string?)null,
                    shortages = new List<object>(),
                    requirements = new List<object>()
                });
            }

            if (request.Items == null || request.Items.Count == 0)
                return Ok(new { isSufficient = true, shortages = new List<object>(), requirements = new List<object>() });

            var foodItems = request.Items.Select(i => (MenuItemId: i.MenuItemId, Quantity: (decimal)i.Quantity)).ToList();
            var result = await _recipeStockService.ValidateRecipeStockAsync(
                orgId.Value,
                branchId.Value,
                "Main Kitchen",
                foodItems,
                requireRecipe: false
            );

            return Ok(new
            {
                isSufficient = result.IsSufficient,
                message = result.ErrorMessage,
                shortages = result.Shortages,
                requirements = result.Requirements
            });
        }

        private int? GetUserId() => int.TryParse(User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value, out var id) ? id : null;
    }

    public class CheckOrderStockRequest
    {
        public int? BranchId { get; set; }
        public List<CreateOrderLineRequest> Items { get; set; } = new();
    }

    public class CreateOrderRequest
    {
        public int? BranchId { get; set; }
        public string? TableNumber { get; set; }
        public string? CustomerName { get; set; }
        public string? OrderNumber { get; set; }
        public string? SaleType { get; set; }
        public List<CreateOrderLineRequest> Items { get; set; } = new();
    }

    public class CounterSaleRequest
    {
        public int? BranchId { get; set; }
        public string? CustomerName { get; set; }
        public string? PaymentMethod { get; set; } = "Cash";
        public decimal? AmountTendered { get; set; }
        public decimal? Discount { get; set; }
        public List<CreateOrderLineRequest> Items { get; set; } = new();
    }

    public class CreateOrderLineRequest
    {
        public int MenuItemId { get; set; }
        public decimal Quantity { get; set; }
    }

    public class ExtendOrderRequest
    {
        public List<CreateOrderLineRequest> Items { get; set; } = new();
    }

    public class CloseTableRequest
    {
        public decimal? Discount { get; set; }
    }

    public class UpdateOrderStatusRequest
    {
        public string Status { get; set; } = string.Empty;
    }
}
