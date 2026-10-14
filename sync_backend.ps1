$orig = Get-Item "backend\Samaya.API\bin\test\Samaya.Server.dll"
$origTime = $orig.CreationTime
$origLastWrite = $orig.LastWriteTime
Copy-Item "backend\Samaya.API\bin\Debug\net10.0\Samaya.Server.dll" "backend\Samaya.API\bin\test\Samaya.Server.dll" -Force
$dest = Get-Item "backend\Samaya.API\bin\test\Samaya.Server.dll"
$dest.CreationTime = $origTime
Write-Host "Updated bin\test\Samaya.Server.dll with CreationTime: $origTime"

# Check for SamayaDevCert in cert store and sign if available
$cert = Get-ChildItem Cert:\CurrentUser\My | Where-Object { $_.Subject -like "*SamayaDevCert*" } | Select-Object -First 1
if ($cert) {
    Set-AuthenticodeSignature -FilePath "backend\Samaya.API\bin\test\Samaya.Server.dll" -Certificate $cert
    Write-Host "Signed bin\test\Samaya.Server.dll with SamayaDevCert"
} else {
    Write-Host "No SamayaDevCert found in CurrentUser\My, relying on timestamp"
}
