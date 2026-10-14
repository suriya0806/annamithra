$ErrorActionPreference = "Stop"

Write-Host "=== 1. Authenticate as Org Admin ==="
$loginBody = @{ email = "saravana@gmail.com"; password = "SuperAdmin@123" } | ConvertTo-Json
$auth = Invoke-RestMethod -Uri "http://localhost:5042/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $auth.token
$headers = @{ Authorization = "Bearer $token" }
Write-Host "Authenticated: OrgId = $($auth.user.organizationId)"

Write-Host "`n=== 2. Create KMS Only Branch ==="
$kmsBranchCode = "KMS" + (Get-Random -Minimum 100 -Maximum 999)
$kmsBranchBody = @{
    name = "KMS Test Branch"
    code = $kmsBranchCode
    address = "123 Kitchen Road"
    city = "Madurai"
    phone = "9876500001"
    moduleType = "KMS Only"
} | ConvertTo-Json

$kmsBranch = Invoke-RestMethod -Uri "http://localhost:5042/api/branches" -Method Post -Headers $headers -Body $kmsBranchBody -ContentType "application/json"
$kmsBranchId = $kmsBranch.branch.id
Write-Host "Created KMS Branch ID: $kmsBranchId, ModuleType: $($kmsBranch.branch.moduleType)"

Write-Host "`n=== 3. Create POS Only Branch ==="
$posBranchCode = "POS" + (Get-Random -Minimum 100 -Maximum 999)
$posBranchBody = @{
    name = "POS Test Branch"
    code = $posBranchCode
    address = "456 Counter Street"
    city = "Madurai"
    phone = "9876500002"
    moduleType = "POS Only"
} | ConvertTo-Json

$posBranch = Invoke-RestMethod -Uri "http://localhost:5042/api/branches" -Method Post -Headers $headers -Body $posBranchBody -ContentType "application/json"
$posBranchId = $posBranch.branch.id
Write-Host "Created POS Branch ID: $posBranchId, ModuleType: $($posBranch.branch.moduleType)"

Write-Host "`n=== 4. Verify Branches List returns ModuleType ==="
$branches = Invoke-RestMethod -Uri "http://localhost:5042/api/branches" -Method Get -Headers $headers
foreach ($b in $branches) {
    Write-Host "Branch ID: $($b.id), Name: $($b.name), ModuleType: $($b.moduleType)"
}

Write-Host "`n=== 5. Verify Branch Details endpoint returns ModuleType ==="
$kmsDetails = Invoke-RestMethod -Uri "http://localhost:5042/api/branches/$kmsBranchId" -Method Get -Headers $headers
Write-Host "KMS Branch Details ModuleType: $($kmsDetails.moduleType)"
$posDetails = Invoke-RestMethod -Uri "http://localhost:5042/api/branches/$posBranchId" -Method Get -Headers $headers
Write-Host "POS Branch Details ModuleType: $($posDetails.moduleType)"

Write-Host "`n=== 6. Test KMS Only Restrictions (POS Order/Billing Rejected with HTTP 400) ==="
# Test creating POS order on KMS Only branch
$orderBody = @{
    branchId = $kmsBranchId
    saleType = "DineIn"
    customerName = "KMS Customer"
    tableNumber = "T1"
    items = @(
        @{ menuItemId = 1; quantity = 1; price = 100 }
    )
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "http://localhost:5042/api/orders" -Method Post -Headers $headers -Body $orderBody -ContentType "application/json"
    Write-Host "ERROR: Expected 400 for POS order on KMS Only branch, but got success!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "SUCCESS: POS Order on KMS Only branch rejected with HTTP $statusCode ($($_.Exception.Message))" -ForegroundColor Green
}

# Test creating Production Plan on KMS Only branch (should reject with 400)
$planBody = @{
    branchId = $kmsBranchId
    planDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    notes = "Test KMS Plan"
    items = @(
        @{ menuItemId = 1; plannedQuantity = 10 }
    )
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "http://localhost:5042/api/kitchen/production-plans" -Method Post -Headers $headers -Body $planBody -ContentType "application/json"
    Write-Host "ERROR: Expected 400 for Production Plan on KMS Only branch, but got success!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "SUCCESS: Production Plan on KMS Only branch rejected with HTTP $statusCode ($($_.Exception.Message))" -ForegroundColor Green
}

Write-Host "`n=== 7. Test POS Only Restrictions (Material Issue/Return Rejected with HTTP 400) ==="
# Test creating Material Issue on POS Only branch (should reject with 400)
$issueBody = @{
    branchId = $posBranchId
    issueDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    notes = "Test Issue"
    items = @(
        @{ inventoryItemId = 1; quantity = 5 }
    )
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "http://localhost:5042/api/kitchen/material-issues" -Method Post -Headers $headers -Body $issueBody -ContentType "application/json"
    Write-Host "ERROR: Expected 400 for Material Issue on POS Only branch, but got success!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "SUCCESS: Material Issue on POS Only branch rejected with HTTP $statusCode ($($_.Exception.Message))" -ForegroundColor Green
}

# Test creating Material Return on POS Only branch (should reject with 400)
$returnBody = @{
    branchId = $posBranchId
    returnDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    notes = "Test Return"
    items = @(
        @{ inventoryItemId = 1; quantity = 2 }
    )
} | ConvertTo-Json

try {
    $res = Invoke-RestMethod -Uri "http://localhost:5042/api/kitchen/material-returns" -Method Post -Headers $headers -Body $returnBody -ContentType "application/json"
    Write-Host "ERROR: Expected 400 for Material Return on POS Only branch, but got success!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "SUCCESS: Material Return on POS Only branch rejected with HTTP $statusCode ($($_.Exception.Message))" -ForegroundColor Green
}

Write-Host "`n=== 8. Test POS Order on POS Only branch (Success without KOT or Recipes) ==="
# Create a menu item on the POS Only branch without recipe
$menuCreateBody = @{
    branchId = $posBranchId
    name = "POS Burger " + (Get-Random -Minimum 100 -Maximum 999)
    category = "Fast Food"
    price = 120
    description = "Quick burger"
    unit = "Portion"
} | ConvertTo-Json

$createdMenuItem = Invoke-RestMethod -Uri "http://localhost:5042/api/menu" -Method Post -Headers $headers -Body $menuCreateBody -ContentType "application/json"
$posMenuItemId = $createdMenuItem.item.id
Write-Host "Created Menu Item for POS Only branch without recipe: $posMenuItemId ($($createdMenuItem.item.name))"

$posOrderBody = @{
    branchId = $posBranchId
    saleType = "Takeaway"
    customerName = "POS Only Customer"
    items = @(
        @{ menuItemId = $posMenuItemId; quantity = 2; price = 120 }
    )
} | ConvertTo-Json

$createdOrder = Invoke-RestMethod -Uri "http://localhost:5042/api/orders" -Method Post -Headers $headers -Body $posOrderBody -ContentType "application/json"
$posOrderId = $createdOrder.id
Write-Host "SUCCESS: POS Order created for POS Only branch! Order ID: $posOrderId, Number: $($createdOrder.orderNumber)"

# Verify no KOT was created for POS Only branch
$kots = Invoke-RestMethod -Uri "http://localhost:5042/api/kot?branchId=$posBranchId" -Method Get -Headers $headers
Write-Host "KOT count for POS Only branch: $($kots.Count) (Expected: 0)"

# Verify bill can be generated
$billBody = @{
    orderId = $posOrderId
} | ConvertTo-Json
$generatedBill = Invoke-RestMethod -Uri "http://localhost:5042/api/bills" -Method Post -Headers $headers -Body $billBody -ContentType "application/json"
Write-Host "SUCCESS: Bill generated for POS Only branch! Bill Number: $($generatedBill.bill.billNumber), GrandTotal: $($generatedBill.bill.grandTotal)"

# Verify Production Plan works on POS Only branch
$posPlanBody = @{
    branchId = $posBranchId
    planDate = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
    notes = "POS Branch Daily Plan"
    items = @(
        @{ menuItemId = $posMenuItemId; plannedQuantity = 20 }
    )
} | ConvertTo-Json

$createdPlan = Invoke-RestMethod -Uri "http://localhost:5042/api/kitchen/production-plans" -Method Post -Headers $headers -Body $posPlanBody -ContentType "application/json"
Write-Host "SUCCESS: Production Plan created for POS Only branch! Plan ID: $($createdPlan.plan.id)"

Write-Host "`n=== 9. Verify Both POS + KMS Branch (Branch 6) is untouched and works as before ==="
$bothBranch = Invoke-RestMethod -Uri "http://localhost:5042/api/branches/6" -Method Get -Headers $headers
Write-Host "Branch 6 ModuleType: $($bothBranch.moduleType)"
