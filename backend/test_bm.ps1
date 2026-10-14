$body = @{ email = 's@gmail.com'; password = '1234' } | ConvertTo-Json
$res = Invoke-RestMethod -Uri 'http://localhost:5042/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
Write-Host "SUCCESS with password 1234! Role: $($res.user.role), BranchId: $($res.user.branchId)"
$token = $res.token
$headers = @{ Authorization = "Bearer $token" }

try {
    $u = Invoke-RestMethod -Uri 'http://localhost:5042/api/users' -Method Get -Headers $headers
    Write-Host "/api/users GET SUCCESS! Count: $($u.Count)"
} catch {
    Write-Host "/api/users GET FAILED: $($_.Exception.Message)"
}
