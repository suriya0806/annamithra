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
    [Route("api/menu")]
    [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Waiter,Cashier,Accountant")]
    public class MenuController : ControllerBase
    {
        private readonly SamayaDbContext _context;
        private readonly RecipeStockService _recipeStockService;

        public MenuController(SamayaDbContext context, RecipeStockService recipeStockService)
        {
            _context = context;
            _recipeStockService = recipeStockService;
        }

        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] int? branchId = null)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var query = _context.MenuItems
                .AsNoTracking()
                .Include(m => m.Branch)
                .Include(m => m.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .Where(m => m.OrganizationId == orgId.Value && m.IsActive);

            if (AuthorizationHelper.IsBranchUser(User))
            {
                var own = AuthorizationHelper.GetBranchId(User);
                if (!own.HasValue) return Forbid();
                query = query.Where(m => m.BranchId == own.Value);
            }
            else if (branchId.HasValue)
            {
                query = query.Where(m => m.BranchId == branchId.Value);
            }

            var items = await query.OrderBy(m => m.Category).ThenBy(m => m.Name).Select(m => new
            {
                m.Id,
                m.BranchId,
                branchName = m.Branch != null ? m.Branch.Name : "",
                m.Name,
                m.Category,
                m.Price,
                m.Description,
                imageUrl = m.ImageUrl,
                unit = m.Unit ?? "Portion",
                m.Code,
                m.IsActive,
                m.CreatedAt,
                hasRecipe = m.Ingredients.Any(),
                recipeCount = m.Ingredients.Count,
                ingredients = m.Ingredients.Select(i => new
                {
                    id = i.Id,
                    inventoryItemId = i.InventoryItemId,
                    inventoryItemName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                    itemCode = i.InventoryItem != null ? (i.InventoryItem.ItemCode ?? "") : "",
                    quantity = i.Quantity,
                    unit = !string.IsNullOrWhiteSpace(i.Unit) ? i.Unit : (i.InventoryItem != null ? i.InventoryItem.Unit : "unit"),
                    availableStock = i.InventoryItem != null ? i.InventoryItem.CurrentStock : 0,
                    notes = i.Notes
                }).ToList()
            }).ToListAsync();

            return Ok(items);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var item = await _context.MenuItems
                .AsNoTracking()
                .Include(m => m.Branch)
                .Include(m => m.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value && m.IsActive);

            if (item == null) return NotFound(new { message = "Menu item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            return Ok(new
            {
                item.Id,
                item.BranchId,
                branchName = item.Branch != null ? item.Branch.Name : "",
                item.Name,
                item.Category,
                item.Price,
                item.Description,
                imageUrl = item.ImageUrl,
                unit = item.Unit ?? "Portion",
                item.Code,
                item.IsActive,
                hasRecipe = item.Ingredients.Any(),
                recipeCount = item.Ingredients.Count,
                ingredients = item.Ingredients.Select(i => new
                {
                    id = i.Id,
                    inventoryItemId = i.InventoryItemId,
                    inventoryItemName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                    ingredientName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                    itemCode = i.InventoryItem != null ? (i.InventoryItem.ItemCode ?? "") : "",
                    quantity = i.Quantity,
                    unit = !string.IsNullOrWhiteSpace(i.Unit) ? i.Unit : (i.InventoryItem != null ? i.InventoryItem.Unit : "unit"),
                    availableStock = i.InventoryItem != null ? i.InventoryItem.CurrentStock : 0,
                    notes = i.Notes
                }).ToList()
            });
        }

        [HttpPost]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> Create(CreateMenuItemRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var branchId = ResolveBranch(request.BranchId);
            if (!branchId.HasValue) return BadRequest(new { message = "A branch is required." });
            if (string.IsNullOrWhiteSpace(request.Name) || request.Price < 0)
                return BadRequest(new { message = "Food name and valid price are required." });

            var branchOk = await _context.Branches.AnyAsync(b => b.Id == branchId && b.OrganizationId == orgId && b.IsActive);
            if (!branchOk) return BadRequest(new { message = "Invalid branch." });

            var existing = await _context.MenuItems
                .Include(m => m.Ingredients)
                .FirstOrDefaultAsync(m =>
                    m.OrganizationId == orgId.Value &&
                    m.BranchId == branchId.Value &&
                    m.Name.ToLower() == request.Name.Trim().ToLower());

            if (existing != null)
            {
                if (existing.IsActive)
                {
                    return BadRequest(new { message = $"A food item named '{request.Name.Trim()}' already exists in this branch. Please choose a different name or edit the existing item." });
                }

                existing.IsActive = true;
                existing.Category = string.IsNullOrWhiteSpace(request.Category) ? "Main Course" : request.Category.Trim();
                existing.Price = request.Price;
                existing.Description = request.Description?.Trim();
                existing.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
                existing.Code = request.Code?.Trim();
                existing.Unit = string.IsNullOrWhiteSpace(request.Unit) ? "Portion" : request.Unit.Trim();
                await _context.SaveChangesAsync();

                var hasRecipeExisting = existing.Ingredients != null && existing.Ingredients.Any();
                return Ok(new
                {
                    message = "Food re-activated successfully. You can now add its recipe.",
                    item = new
                    {
                        existing.Id,
                        existing.BranchId,
                        existing.Name,
                        existing.Category,
                        existing.Price,
                        existing.Description,
                        imageUrl = existing.ImageUrl,
                        existing.Unit,
                        existing.Code,
                        existing.IsActive,
                        hasRecipe = hasRecipeExisting,
                        recipeCount = hasRecipeExisting ? existing.Ingredients!.Count : 0,
                        ingredients = new List<object>()
                    }
                });
            }

            var item = new MenuItem
            {
                OrganizationId = orgId.Value,
                BranchId = branchId.Value,
                Name = request.Name.Trim(),
                Category = string.IsNullOrWhiteSpace(request.Category) ? "Main Course" : request.Category.Trim(),
                Price = request.Price,
                Description = request.Description?.Trim(),
                ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim(),
                Unit = string.IsNullOrWhiteSpace(request.Unit) ? "Portion" : request.Unit.Trim(),
                Code = request.Code?.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.MenuItems.Add(item);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Food created successfully. You can now add its recipe.",
                item = new
                {
                    item.Id,
                    item.BranchId,
                    item.Name,
                    item.Category,
                    item.Price,
                    item.Description,
                    imageUrl = item.ImageUrl,
                    item.Unit,
                    item.Code,
                    item.IsActive,
                    hasRecipe = false,
                    recipeCount = 0,
                    ingredients = new List<object>()
                }
            });
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> Update(int id, UpdateMenuItemRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var item = await _context.MenuItems.FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value && m.IsActive);
            if (item == null) return NotFound(new { message = "Food item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            if (string.IsNullOrWhiteSpace(request.Name) || request.Price < 0)
                return BadRequest(new { message = "Food name and valid price are required." });

            item.Name = request.Name.Trim();
            if (!string.IsNullOrWhiteSpace(request.Category)) item.Category = request.Category.Trim();
            item.Price = request.Price;
            item.Description = request.Description?.Trim();
            if (request.ImageUrl != null)
            {
                item.ImageUrl = string.IsNullOrWhiteSpace(request.ImageUrl) ? null : request.ImageUrl.Trim();
            }
            if (!string.IsNullOrWhiteSpace(request.Unit)) item.Unit = request.Unit.Trim();
            if (request.Code != null) item.Code = request.Code.Trim();
            if (request.IsActive.HasValue) item.IsActive = request.IsActive.Value;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Food item updated successfully.", item });
        }

        [HttpDelete("{id:int}/image")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> RemoveImage(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var item = await _context.MenuItems.FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value && m.IsActive);
            if (item == null) return NotFound(new { message = "Food item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            item.ImageUrl = null;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Photo removed successfully.", id });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> Delete(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var item = await _context.MenuItems.FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value);
            if (item == null) return NotFound(new { message = "Food item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, item.BranchId))
                return Forbid();

            item.IsActive = false;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Food item deleted." });
        }

        [HttpGet("{id:int}/recipe")]
        public async Task<IActionResult> GetRecipe(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var menu = await _context.MenuItems
                .AsNoTracking()
                .Include(m => m.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value && m.IsActive);

            if (menu == null) return NotFound(new { message = "Food item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, menu.BranchId))
                return Forbid();

            // Load Kitchen Stock for these ingredients
            var invIds = menu.Ingredients.Select(i => i.InventoryItemId).ToList();
            var kitchenStocks = await _context.KitchenStocks
                .AsNoTracking()
                .Where(ks => ks.BranchId == menu.BranchId && invIds.Contains(ks.InventoryItemId))
                .ToDictionaryAsync(ks => ks.InventoryItemId);

            var ingredients = menu.Ingredients.Select(i =>
            {
                var kStock = kitchenStocks.TryGetValue(i.InventoryItemId, out var ks) ? ks.CurrentStock : 0m;
                var stockUnit = i.InventoryItem != null ? i.InventoryItem.Unit : "KG";
                return new
                {
                    id = i.Id,
                    inventoryItemId = i.InventoryItemId,
                    inventoryItemName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                    ingredientName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                    itemCode = i.InventoryItem != null ? (i.InventoryItem.ItemCode ?? "") : "",
                    quantity = i.Quantity,
                    unit = !string.IsNullOrWhiteSpace(i.Unit) ? i.Unit : (i.InventoryItem != null ? i.InventoryItem.Unit : "unit"),
                    kitchenStock = kStock,
                    kitchenStockFormatted = UnitConversionHelper.FormatQuantityWithUnit(kStock, stockUnit),
                    centralStock = i.InventoryItem != null ? i.InventoryItem.CurrentStock : 0m,
                    availableStock = kStock, // Recipe ingredients deduct directly from Kitchen Stock
                    notes = i.Notes
                };
            }).ToList();

            return Ok(new
            {
                foodId = menu.Id,
                foodName = menu.Name,
                category = menu.Category,
                price = menu.Price,
                branchId = menu.BranchId,
                hasRecipe = ingredients.Count > 0,
                recipeCount = ingredients.Count,
                ingredients
            });
        }

        [HttpPost("{id:int}/recipe")]
        [HttpPut("{id:int}/recipe")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> SaveRecipe(int id, SaveRecipeRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var menu = await _context.MenuItems.FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value && m.IsActive);
            if (menu == null) return NotFound(new { message = "Food item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, menu.BranchId))
                return Forbid();

            // Support either list of ingredients or single ingredient
            var itemsToSave = new List<RecipeIngredientItemDto>();
            if (request.Ingredients != null && request.Ingredients.Count > 0)
            {
                itemsToSave.AddRange(request.Ingredients);
            }
            else if (request.InventoryItemId > 0 && request.Quantity > 0)
            {
                itemsToSave.Add(new RecipeIngredientItemDto
                {
                    InventoryItemId = request.InventoryItemId,
                    Quantity = request.Quantity,
                    Unit = request.Unit,
                    Notes = request.Notes
                });
            }

            if (itemsToSave.Count == 0)
            {
                return BadRequest(new { message = "At least one ingredient is required to save a recipe." });
            }

            // Validate that all inventory items exist in this branch and belong to organization
            var invIds = itemsToSave.Select(it => it.InventoryItemId).Distinct().ToList();
            var validInventoryItems = await _context.InventoryItems
                .Where(i => invIds.Contains(i.Id) && i.OrganizationId == orgId.Value && i.BranchId == menu.BranchId && i.IsActive)
                .ToDictionaryAsync(i => i.Id);

            foreach (var item in itemsToSave)
            {
                if (!validInventoryItems.ContainsKey(item.InventoryItemId))
                {
                    return BadRequest(new { message = $"Inventory item ID {item.InventoryItemId} is not valid or not in this branch." });
                }
                if (item.Quantity <= 0)
                {
                    return BadRequest(new { message = $"Quantity for ingredient '{validInventoryItems[item.InventoryItemId].Name}' must be greater than zero." });
                }
            }

            // Remove existing ingredients for this food to maintain: ONE FOOD -> ONE ACTIVE RECIPE
            var existingIngredients = await _context.RecipeIngredients.Where(r => r.MenuItemId == id).ToListAsync();
            _context.RecipeIngredients.RemoveRange(existingIngredients);

            // Add new ingredients without duplicates
            var addedSet = new HashSet<int>();
            foreach (var it in itemsToSave)
            {
                if (addedSet.Contains(it.InventoryItemId)) continue; // prevent duplicate inventory item in same recipe
                addedSet.Add(it.InventoryItemId);

                var inv = validInventoryItems[it.InventoryItemId];
                _context.RecipeIngredients.Add(new RecipeIngredient
                {
                    OrganizationId = orgId.Value,
                    BranchId = menu.BranchId,
                    MenuItemId = id,
                    InventoryItemId = it.InventoryItemId,
                    Quantity = it.Quantity,
                    Unit = !string.IsNullOrWhiteSpace(it.Unit) ? it.Unit.Trim() : inv.Unit,
                    Notes = it.Notes?.Trim()
                });
            }

            await _context.SaveChangesAsync();

            // Reload and return updated recipe details
            var updated = await _context.RecipeIngredients
                .AsNoTracking()
                .Include(r => r.InventoryItem)
                .Where(r => r.MenuItemId == id)
                .Select(i => new
                {
                    id = i.Id,
                    inventoryItemId = i.InventoryItemId,
                    inventoryItemName = i.InventoryItem != null ? i.InventoryItem.Name : "",
                    itemCode = i.InventoryItem != null ? (i.InventoryItem.ItemCode ?? "") : "",
                    quantity = i.Quantity,
                    unit = !string.IsNullOrWhiteSpace(i.Unit) ? i.Unit : (i.InventoryItem != null ? i.InventoryItem.Unit : "unit"),
                    availableStock = i.InventoryItem != null ? i.InventoryItem.CurrentStock : 0,
                    notes = i.Notes
                }).ToListAsync();

            return Ok(new
            {
                message = "Recipe saved successfully.",
                foodId = menu.Id,
                foodName = menu.Name,
                hasRecipe = updated.Count > 0,
                recipeCount = updated.Count,
                ingredients = updated
            });
        }

        [HttpDelete("{id:int}/recipe")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Inventory Manager")]
        public async Task<IActionResult> DeleteRecipe(int id)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var menu = await _context.MenuItems.FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value && m.IsActive);
            if (menu == null) return NotFound(new { message = "Food item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, menu.BranchId))
                return Forbid();

            var existing = await _context.RecipeIngredients.Where(r => r.MenuItemId == id).ToListAsync();
            _context.RecipeIngredients.RemoveRange(existing);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Recipe removed successfully." });
        }

        [HttpPost("{id:int}/check-stock")]
        public async Task<IActionResult> CheckStock(int id, [FromBody] CheckFoodStockRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var menu = await _context.MenuItems
                .AsNoTracking()
                .Include(m => m.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value && m.IsActive);

            if (menu == null) return NotFound(new { message = "Food item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, menu.BranchId))
                return Forbid();

            var qty = request.Quantity > 0 ? request.Quantity : 1;
            var validation = await _recipeStockService.ValidateRecipeStockAsync(orgId.Value, menu.BranchId, "Main Kitchen", new[] { (menu.Id, qty) });

            return Ok(new
            {
                foodId = menu.Id,
                foodName = menu.Name,
                quantity = qty,
                isAvailable = validation.IsSufficient,
                shortages = validation.Shortages,
                requirements = validation.Requirements,
                message = validation.ErrorMessage
            });
        }

        [HttpPost("{id:int}/prepare")]
        [Authorize(Roles = "Super Admin,Organization Admin,Branch Manager,Kitchen Manager,Chef,Cook")]
        public async Task<IActionResult> PrepareFood(int id, [FromBody] PrepareFoodRequest request)
        {
            var orgId = AuthorizationHelper.GetOrganizationId(User);
            if (orgId == null) return Unauthorized();

            var menu = await _context.MenuItems
                .Include(m => m.Ingredients)
                    .ThenInclude(i => i.InventoryItem)
                .FirstOrDefaultAsync(m => m.Id == id && m.OrganizationId == orgId.Value && m.IsActive);

            if (menu == null) return NotFound(new { message = "Food item not found." });

            if (AuthorizationHelper.IsBranchUser(User) && !AuthorizationHelper.BelongsToBranch(User, menu.BranchId))
                return Forbid();

            if (!menu.Ingredients.Any())
            {
                return BadRequest(new { message = $"Cannot prepare '{menu.Name}' because no recipe has been defined for it." });
            }

            var qty = request.Quantity > 0 ? request.Quantity : 1;
            var currentUserId = AuthorizationHelper.GetUserId(User) ?? 1;
            var prodNumber = $"PRD-{DateTime.UtcNow:yyyyMMdd}-{new Random().Next(1000, 9999)}";

            // 1. Transactional Validation & Deduction from Kitchen Stock
            var result = await _recipeStockService.DeductRecipeStockAsync(
                orgId.Value,
                menu.BranchId,
                "Main Kitchen",
                new[] { (menu.Id, qty) },
                userId: currentUserId,
                referenceNumber: prodNumber,
                referenceType: "MENU_PRODUCTION",
                referenceId: menu.Id.ToString()
            );

            if (!result.Success)
            {
                return BadRequest(new
                {
                    message = result.Message,
                    shortages = result.Shortages,
                    title = "Insufficient Kitchen Stock"
                });
            }

            // 2. Record ActualProduction entry in the Kitchen module for tracking
            var prod = new ActualProduction
            {
                OrganizationId = orgId.Value,
                BranchId = menu.BranchId,
                ProductionNumber = prodNumber,
                ProductionDate = DateTime.UtcNow,
                MenuItemId = menu.Id,
                PlannedQuantity = qty,
                ActualQuantity = qty,
                WastageQuantity = 0,
                Remarks = request.Notes ?? $"Direct preparation of {qty} × {menu.Name}",
                CreatedByUserId = currentUserId,
                Status = "COMPLETED",
                CreatedAt = DateTime.UtcNow
            };
            _context.ActualProductions.Add(prod);
            await _context.SaveChangesAsync();

            // Record ActualProductionIngredients
            foreach (var req in result.Requirements)
            {
                _context.ActualProductionIngredients.Add(new ActualProductionIngredient
                {
                    ActualProductionId = prod.Id,
                    InventoryItemId = req.InventoryItemId,
                    PlannedQuantity = req.RequiredQuantity,
                    Quantity = req.RequiredQuantity,
                    Unit = req.Unit
                });
            }
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = $"Successfully prepared {qty} portion(s) of '{menu.Name}'. Recipe ingredients automatically deducted from Kitchen Stock.",
                foodName = menu.Name,
                quantityPrepared = qty,
                productionNumber = prodNumber,
                requirements = result.Requirements
            });
        }

        private int? ResolveBranch(int? requested) => AuthorizationHelper.IsBranchUser(User) ? AuthorizationHelper.GetBranchId(User) : requested;
    }

    public class CreateMenuItemRequest
    {
        public int? BranchId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public decimal Price { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? Unit { get; set; }
        public string? Code { get; set; }
    }

    public class UpdateMenuItemRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Category { get; set; }
        public decimal Price { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? Unit { get; set; }
        public string? Code { get; set; }
        public bool? IsActive { get; set; }
    }

    public class SaveRecipeRequest
    {
        public List<RecipeIngredientItemDto>? Ingredients { get; set; }
        // Fallback for single item request
        public int InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public string? Notes { get; set; }
    }

    public class RecipeIngredientItemDto
    {
        public int InventoryItemId { get; set; }
        public decimal Quantity { get; set; }
        public string? Unit { get; set; }
        public string? Notes { get; set; }
    }

    public class CheckFoodStockRequest
    {
        public decimal Quantity { get; set; } = 1;
    }

    public class PrepareFoodRequest
    {
        public decimal Quantity { get; set; } = 1;
        public string? Notes { get; set; }
    }
}
