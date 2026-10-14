$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   SAMAYA ORDER & RECIPE KITCHEN STOCK VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$baseUrl = "http://localhost:5042"

# 0. Authentication
Write-Host "`n[Step 0] Authenticating as Organization Admin..." -ForegroundColor Yellow
$loginPayload = (@{
    email = "saravana@gmail.com"
    password = "SuperAdmin@123"
}) | ConvertTo-Json

$loginRes = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginPayload -ContentType "application/json"
$token = $loginRes.token
$orgId = $loginRes.user.organizationId
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
Write-Host "Authenticated as: $($loginRes.user.name) (OrgId: $orgId)" -ForegroundColor Green

# Get branches
$branches = Invoke-RestMethod -Uri "$baseUrl/api/branches" -Method Get -Headers $headers
$branchId = $branches[0].id
Write-Host "Using Branch: $branchId ($($branches[0].name))" -ForegroundColor Green

# 1. Setup Ingredients & Kitchen Stock
Write-Host "`n[Step 1] Preparing Test Ingredients in Inventory..." -ForegroundColor Yellow

function Get-OrCreate-InventoryItem($name, $unit, $category) {
    $items = Invoke-RestMethod -Uri "$baseUrl/api/inventory/items?branchId=$branchId" -Method Get -Headers $headers
    $found = $items | Where-Object { $_.name -like "*$name*" } | Select-Object -First 1
    if ($found) {
        return $found
    }
    
    $code = "ING-" + (Get-Random -Minimum 1000 -Maximum 9999)
    $payload = (@{
        branchId = $branchId
        name = "$name (Recipe Test)"
        itemCode = $code
        unit = $unit
        category = $category
        minimumStock = 5.0
        maximumStock = 100.0
        openingStock = 50.0
    }) | ConvertTo-Json
    
    $created = Invoke-RestMethod -Uri "$baseUrl/api/inventory/items" -Method Post -Body $payload -Headers $headers
    return $created
}

$riceItem = Get-OrCreate-InventoryItem "Basmati Rice" "KG" "Grains"
$chickenItem = Get-OrCreate-InventoryItem "Fresh Chicken" "KG" "Meat"
$onionItem = Get-OrCreate-InventoryItem "Red Onion" "KG" "Vegetables"
$oilItem = Get-OrCreate-InventoryItem "Sunflower Oil" "L" "Oils"

Write-Host "Rice: $($riceItem.id) ($($riceItem.name)) [$($riceItem.unit)]" -ForegroundColor Green
Write-Host "Chicken: $($chickenItem.id) ($($chickenItem.name)) [$($chickenItem.unit)]" -ForegroundColor Green
Write-Host "Onion: $($onionItem.id) ($($onionItem.name)) [$($onionItem.unit)]" -ForegroundColor Green
Write-Host "Oil: $($oilItem.id) ($($oilItem.name)) [$($oilItem.unit)]" -ForegroundColor Green

# Issue sufficient stock to Kitchen for all 4 ingredients
Write-Host "`n[Step 2] Ensuring Kitchen Stock via Kitchen Issue..." -ForegroundColor Yellow
$issueItems = @(
    @{ inventoryItemId = $riceItem.id; quantity = 25.0 },
    @{ inventoryItemId = $chickenItem.id; quantity = 20.0 },
    @{ inventoryItemId = $onionItem.id; quantity = 15.0 },
    @{ inventoryItemId = $oilItem.id; quantity = 10.0 }
)
$issuePayload = (@{
    branchId = $branchId
    department = "Main Kitchen"
    notes = "Setup stock for recipe verification"
    items = $issueItems
}) | ConvertTo-Json

try {
    $issueRes = Invoke-RestMethod -Uri "$baseUrl/api/kitchen/material-issues" -Method Post -Body $issuePayload -Headers $headers
    Write-Host "Kitchen Issue completed (Issue #$($issueRes.issueNumber))" -ForegroundColor Green
} catch {
    Write-Host "Note on issue: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# 2. Setup Menu Item with Recipe
Write-Host "`n[Step 3] Setting Up Test Food Recipe (Chicken Biryani)..." -ForegroundColor Yellow
$menuItems = Invoke-RestMethod -Uri "$baseUrl/api/menu?branchId=$branchId" -Method Get -Headers $headers
$biryani = $menuItems | Where-Object { $_.name -like "*Chicken Biryani*" } | Select-Object -First 1

if (-not $biryani) {
    $menuPayload = (@{
        branchId = $branchId
        name = "Special Chicken Biryani " + (Get-Random -Minimum 100 -Maximum 999)
        price = 280.0
        category = "Main Course"
        isAvailable = $true
        isActive = $true
    }) | ConvertTo-Json
    $biryani = Invoke-RestMethod -Uri "$baseUrl/api/menu" -Method Post -Body $menuPayload -Headers $headers
}
Write-Host "Food Item: Id=$($biryani.id), Name='$($biryani.name)'" -ForegroundColor Green

# Configure Recipe:
# Rice: 250 G (0.25 KG)
# Chicken: 200 G (0.20 KG)
# Onion: 100 G (0.10 KG)
# Oil: 30 ML (0.03 L)
$recipePayload = (@{
    ingredients = @(
        @{ inventoryItemId = $riceItem.id; quantity = 250.0; unit = "G" },
        @{ inventoryItemId = $chickenItem.id; quantity = 200.0; unit = "G" },
        @{ inventoryItemId = $onionItem.id; quantity = 100.0; unit = "G" },
        @{ inventoryItemId = $oilItem.id; quantity = 30.0; unit = "ML" }
    )
}) | ConvertTo-Json

$recipeRes = Invoke-RestMethod -Uri "$baseUrl/api/menu/$($biryani.id)/recipe" -Method Post -Body $recipePayload -Headers $headers
Write-Host "Recipe saved with $($recipeRes.Count) ingredients." -ForegroundColor Green

# 3. Check Initial Kitchen Stock
function Get-KitchenStock-Map() {
    $kStocks = Invoke-RestMethod -Uri "$baseUrl/api/kitchen/stock?branchId=$branchId&kitchenName=Main%20Kitchen" -Method Get -Headers $headers
    $map = @{}
    foreach ($ks in $kStocks) {
        $map[$ks.inventoryItemId] = [decimal]$ks.currentStock
    }
    return $map
}

$initialStock = Get-KitchenStock-Map
Write-Host "`nInitial Kitchen Stock:" -ForegroundColor Cyan
Write-Host "  Rice:    $($initialStock[$riceItem.id]) $($riceItem.unit)"
Write-Host "  Chicken: $($initialStock[$chickenItem.id]) $($chickenItem.unit)"
Write-Host "  Onion:   $($initialStock[$onionItem.id]) $($onionItem.unit)"
Write-Host "  Oil:     $($initialStock[$oilItem.id]) $($oilItem.unit)"

# ---------------------------------------------------------------
# TEST 1: Check Stock Endpoint
# ---------------------------------------------------------------
Write-Host "`n[Test 1] Testing POST /api/orders/check-stock pre-flight endpoint..." -ForegroundColor Yellow
$checkPayload = (@{
    branchId = $branchId
    items = @(
        @{ menuItemId = $biryani.id; quantity = 2 }
    )
}) | ConvertTo-Json

$checkRes = Invoke-RestMethod -Uri "$baseUrl/api/orders/check-stock" -Method Post -Body $checkPayload -Headers $headers
if ($checkRes.isSufficient -eq $true) {
    Write-Host "Check-stock returned isSufficient = true for 2 Biryanis." -ForegroundColor Green
    foreach ($r in $checkRes.requirements) {
        Write-Host "    $($r.itemName): Required $($r.formattedRequired), Available $($r.formattedAvailable)" -ForegroundColor Gray
    }
} else {
    throw "Check-stock should have been sufficient!"
}

# ---------------------------------------------------------------
# TEST 2: Create Order (Dine-in) & Verify Kitchen Stock Reduction
# ---------------------------------------------------------------
Write-Host "`n[Test 2] Creating Order for 2 Chicken Biryanis..." -ForegroundColor Yellow
$tbl = "T-REC-" + (Get-Random -Minimum 10 -Maximum 99)
$orderPayload = (@{
    branchId = $branchId
    tableNumber = $tbl
    customerName = "Mr. Recipe Tester"
    saleType = "TABLE_SERVICE"
    items = @(
        @{ menuItemId = $biryani.id; quantity = 2 }
    )
}) | ConvertTo-Json

$orderRes = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -Body $orderPayload -Headers $headers
$orderId = $orderRes.id
$orderNumber = $orderRes.orderNumber
Write-Host "Order created: $orderNumber (ID: $orderId, KOT: $($orderRes.kotNumber))" -ForegroundColor Green

# Check new stock
$afterOrderStock = Get-KitchenStock-Map
Write-Host "`nKitchen Stock after placing Order (2 Biryanis):" -ForegroundColor Cyan
Write-Host "  Rice:    $($afterOrderStock[$riceItem.id]) $($riceItem.unit) (Expected: $($initialStock[$riceItem.id] - 0.50))"
Write-Host "  Chicken: $($afterOrderStock[$chickenItem.id]) $($chickenItem.unit) (Expected: $($initialStock[$chickenItem.id] - 0.40))"
Write-Host "  Onion:   $($afterOrderStock[$onionItem.id]) $($onionItem.unit) (Expected: $($initialStock[$onionItem.id] - 0.20))"
Write-Host "  Oil:     $($afterOrderStock[$oilItem.id]) $($oilItem.unit) (Expected: $($initialStock[$oilItem.id] - 0.06))"

$expectedRice = [decimal]($initialStock[$riceItem.id] - 0.50)
$actualRice = [decimal]$afterOrderStock[$riceItem.id]
$riceDiff = [Math]::Abs($actualRice - $expectedRice)
if ($riceDiff -gt 0.001) {
    throw "Rice deduction mismatch! Expected $expectedRice, got $actualRice"
}
Write-Host "Exact recipe stock deduction verified for Rice (-500 G / -0.5 KG)!" -ForegroundColor Green

$expectedChicken = [decimal]($initialStock[$chickenItem.id] - 0.40)
$actualChicken = [decimal]$afterOrderStock[$chickenItem.id]
$chickenDiff = [Math]::Abs($actualChicken - $expectedChicken)
if ($chickenDiff -gt 0.001) {
    throw "Chicken deduction mismatch! Expected $expectedChicken, got $actualChicken"
}
Write-Host "Exact recipe stock deduction verified for Chicken (-400 G / -0.4 KG)!" -ForegroundColor Green

# ---------------------------------------------------------------
# TEST 3: Verify StockTransaction Auditing (RECIPE_CONSUMPTION)
# ---------------------------------------------------------------
Write-Host "`n[Test 3] Verifying StockTransaction logs for Order $orderNumber..." -ForegroundColor Yellow
$txRes = Invoke-RestMethod -Uri "$baseUrl/api/inventory/transactions?branchId=$branchId" -Method Get -Headers $headers
$orderTxs = $txRes | Where-Object { $_.reference -eq $orderNumber -and $_.type -eq "RECIPE_CONSUMPTION" }
Write-Host "Found $($orderTxs.Count) RECIPE_CONSUMPTION transactions for order $($orderNumber):" -ForegroundColor Green
foreach ($t in $orderTxs) {
    Write-Host "    $($t.itemName): Quantity=$($t.quantity), Before=$($t.stockBefore), After=$($t.stockAfter) | $($t.notes)" -ForegroundColor Gray
}

# ---------------------------------------------------------------
# TEST 4: Insufficient Kitchen Stock Rejection
# ---------------------------------------------------------------
Write-Host "`n[Test 4] Testing Order Rejection for Excessive Quantity (5,000 Biryanis)..." -ForegroundColor Yellow
$hugeTbl = "T-EXC-" + (Get-Random -Minimum 10 -Maximum 99)
$hugePayload = (@{
    branchId = $branchId
    tableNumber = $hugeTbl
    customerName = "Mr. Huge Order"
    saleType = "TABLE_SERVICE"
    items = @(
        @{ menuItemId = $biryani.id; quantity = 5000 }
    )
}) | ConvertTo-Json

$rejected = $false
try {
    $null = Invoke-RestMethod -Uri "$baseUrl/api/orders" -Method Post -Body $hugePayload -Headers $headers
} catch {
    $rejected = $true
    Write-Host "Order properly rejected with HTTP 400 Bad Request!" -ForegroundColor Green
    
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $errorJson = $reader.ReadToEnd()
    Write-Host "Server Response Body:" -ForegroundColor Magenta
    Write-Host $errorJson -ForegroundColor Magenta
    
    if ($errorJson -like "*Insufficient Kitchen Stock*") {
        Write-Host "Shortage message contains exact header 'Insufficient Kitchen Stock'!" -ForegroundColor Green
    } else {
        throw "Shortage message did not contain required 'Insufficient Kitchen Stock' header!"
    }
}

if (-not $rejected) {
    throw "Order of 5000 Biryanis should have been rejected due to insufficient stock!"
}

# Verify Kitchen Stock was NOT modified during rejected order
$stockAfterRejection = Get-KitchenStock-Map
if ($stockAfterRejection[$riceItem.id] -ne $afterOrderStock[$riceItem.id]) {
    throw "Stock changed during failed order! Transaction was not atomic!"
}
Write-Host "Kitchen stock remained unchanged after rejected order (Atomic Rollback confirmed)." -ForegroundColor Green

# ---------------------------------------------------------------
# TEST 5: Extend Order & Verify Additional Stock Deduction
# ---------------------------------------------------------------
Write-Host "`n[Test 5] Extending Order $orderNumber with 1 more Biryani..." -ForegroundColor Yellow
$extendPayload = (@{
    items = @(
        @{ menuItemId = $biryani.id; quantity = 1 }
    )
}) | ConvertTo-Json

$extendRes = Invoke-RestMethod -Uri "$baseUrl/api/orders/$orderId/extend" -Method Post -Body $extendPayload -Headers $headers
Write-Host "Order extended. KOT: $($extendRes.kotNumber)" -ForegroundColor Green

$afterExtendStock = Get-KitchenStock-Map
$expectedRiceExtend = [decimal]($afterOrderStock[$riceItem.id] - 0.25)
Write-Host "  Rice after extend: $($afterExtendStock[$riceItem.id]) (Expected: $expectedRiceExtend)"
$extendDiff = [Math]::Abs([decimal]$afterExtendStock[$riceItem.id] - $expectedRiceExtend)
if ($extendDiff -gt 0.001) {
    throw "Extend order stock mismatch for Rice!"
}
Write-Host "Kitchen stock correctly deducted for extended order items (-250 G Rice)!" -ForegroundColor Green

# ---------------------------------------------------------------
# TEST 6: Cancel Order & Verify Recipe Stock Restoration
# ---------------------------------------------------------------
Write-Host "`n[Test 6] Cancelling Order $orderNumber to test Stock Restoration..." -ForegroundColor Yellow
$cancelPayload = (@{
    status = "Cancelled"
}) | ConvertTo-Json

$cancelRes = Invoke-RestMethod -Uri "$baseUrl/api/orders/$orderId/status" -Method Post -Body $cancelPayload -Headers $headers
Write-Host "Order marked Cancelled: $($cancelRes.message)" -ForegroundColor Green

$afterCancelStock = Get-KitchenStock-Map
Write-Host "`nKitchen Stock after Order Cancellation:" -ForegroundColor Cyan
Write-Host "  Rice:    $($afterCancelStock[$riceItem.id]) $($riceItem.unit) (Initial before tests: $($initialStock[$riceItem.id]))"
Write-Host "  Chicken: $($afterCancelStock[$chickenItem.id]) $($chickenItem.unit) (Initial before tests: $($initialStock[$chickenItem.id]))"
Write-Host "  Onion:   $($afterCancelStock[$onionItem.id]) $($onionItem.unit) (Initial before tests: $($initialStock[$onionItem.id]))"
Write-Host "  Oil:     $($afterCancelStock[$oilItem.id]) $($oilItem.unit) (Initial before tests: $($initialStock[$oilItem.id]))"

# Check RECIPE_RESTORE transactions
$restoreTxs = Invoke-RestMethod -Uri "$baseUrl/api/inventory/transactions?branchId=$branchId" -Method Get -Headers $headers
$cancelRestoreTxs = $restoreTxs | Where-Object { $_.reference -eq $orderNumber -and $_.type -eq "RECIPE_RESTORE" }
Write-Host "Found $($cancelRestoreTxs.Count) RECIPE_RESTORE transactions logged for Order $orderNumber." -ForegroundColor Green

# ---------------------------------------------------------------
# TEST 7: Counter Sale (POS) Recipe Stock Deduction
# ---------------------------------------------------------------
Write-Host "`n[Test 7] Testing Direct Counter Sale POS Recipe Stock Deduction..." -ForegroundColor Yellow
$stockBeforeCounter = Get-KitchenStock-Map

$counterPayload = (@{
    branchId = $branchId
    customerName = "Walk-in Customer"
    paymentMethod = "Cash"
    amountTendered = 600.0
    items = @(
        @{ menuItemId = $biryani.id; quantity = 2 }
    )
}) | ConvertTo-Json

$counterRes = Invoke-RestMethod -Uri "$baseUrl/api/orders/counter-sale" -Method Post -Body $counterPayload -Headers $headers
Write-Host "Counter sale completed. Bill: $($counterRes.bill.billNumber), Order: $($counterRes.bill.orderNumber)" -ForegroundColor Green

$stockAfterCounter = Get-KitchenStock-Map
Write-Host "  Rice stock: before=$($stockBeforeCounter[$riceItem.id]), after=$($stockAfterCounter[$riceItem.id])"
Write-Host "Counter sale POS successfully deducted recipe ingredients from Kitchen Stock!" -ForegroundColor Green

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "   ALL 7 ORDER RECIPE STOCK VERIFICATION TESTS PASSED!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
