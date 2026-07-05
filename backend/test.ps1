# Investment Research Agent - Backend Verification Script
$BASE = "http://localhost:5000"
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "TEST 1: Health Check" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "$BASE/health" -Method GET
Write-Host "  Status: $($health.status)" -ForegroundColor Green

Write-Host ""
Write-Host "TEST 2: Register new user" -ForegroundColor Cyan
$TOKEN = $null
try {
    $reg = Invoke-RestMethod -Uri "$BASE/api/auth/register" -Method POST `
        -ContentType "application/json" `
        -Body '{"email":"testuser@altuni.ai","password":"Test1234"}'
    $TOKEN = $reg.token
    Write-Host "  Registered: $($reg.user.email)" -ForegroundColor Green
} catch {
    Write-Host "  Already exists - falling back to login" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "TEST 3: Login" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "$BASE/api/auth/login" -Method POST `
    -ContentType "application/json" `
    -Body '{"email":"testuser@altuni.ai","password":"Test1234"}'
$TOKEN = $login.token
Write-Host "  Login OK: $($login.user.email)" -ForegroundColor Green
Write-Host "  Token prefix: $($TOKEN.Substring(0,30))..." -ForegroundColor Gray

Write-Host ""
Write-Host "TEST 4: POST /api/jobs (start research)" -ForegroundColor Cyan
$headers = @{ Authorization = "Bearer $TOKEN" }
$job = Invoke-RestMethod -Uri "$BASE/api/jobs" -Method POST `
    -ContentType "application/json" `
    -Headers $headers `
    -Body '{"companyName":"Apple Inc"}'
$JOB_ID = $job.jobId
Write-Host "  Job ID : $JOB_ID" -ForegroundColor Green
Write-Host "  Status : $($job.status)" -ForegroundColor Green
Write-Host "  Cached : $($job.cached)" -ForegroundColor Gray

Write-Host ""
Write-Host "TEST 5: GET /api/jobs/:id (first poll)" -ForegroundColor Cyan
Start-Sleep -Seconds 2
$poll = Invoke-RestMethod -Uri "$BASE/api/jobs/$JOB_ID" -Method GET -Headers $headers
Write-Host "  Status      : $($poll.status)" -ForegroundColor Green
Write-Host "  Current Node: $($poll.currentNode)" -ForegroundColor Yellow

Write-Host ""
Write-Host "TEST 6: GET /api/reports/me" -ForegroundColor Cyan
$myReports = Invoke-RestMethod -Uri "$BASE/api/reports/me" -Method GET -Headers $headers
Write-Host "  Report count: $($myReports.count)" -ForegroundColor Green

Write-Host ""
Write-Host "TEST 7: Unauthenticated request (expect 401)" -ForegroundColor Cyan
try {
    $ErrorActionPreference = "Continue"
    $resp = Invoke-WebRequest -Uri "$BASE/api/jobs" -Method POST `
        -ContentType "application/json" `
        -Body '{"companyName":"Tesla"}' `
        -UseBasicParsing
    Write-Host "  ERROR: Should have been blocked!" -ForegroundColor Red
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    if ($code -eq 401) {
        Write-Host "  Correctly returned 401 - OK" -ForegroundColor Green
    } else {
        Write-Host "  Unexpected status: $code" -ForegroundColor Red
    }
}
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "POLLING JOB UNTIL COMPLETE (max 3 minutes)..." -ForegroundColor Cyan
$maxPolls = 36
for ($i = 1; $i -le $maxPolls; $i++) {
    Start-Sleep -Seconds 5
    $poll = Invoke-RestMethod -Uri "$BASE/api/jobs/$JOB_ID" -Method GET -Headers $headers
    Write-Host "  [$i] Status: $($poll.status) | Node: $($poll.currentNode)" -ForegroundColor Yellow
    if ($poll.status -eq "completed" -or $poll.status -eq "failed") { break }
}

if ($poll.status -eq "completed") {
    $r = $poll.report
    Write-Host ""
    Write-Host "FINAL REPORT" -ForegroundColor Cyan
    Write-Host "  Company   : $($r.companyName)"
    Write-Host "  Verdict   : $($r.verdict)" -ForegroundColor $(if ($r.verdict -eq "INVEST") {"Green"} else {"Red"})
    Write-Host "  Confidence: $($r.confidenceScore)/100"
    Write-Host "  Financial : $($r.financialScore)/100"
    Write-Host "  Sentiment : $($r.sentimentScore)/100"
    Write-Host "  Risk      : $($r.riskLevel)"
    Write-Host "  Horizon   : $($r.recommendedHorizon)"
    Write-Host ""
    Write-Host "  Executive Summary:" -ForegroundColor Cyan
    Write-Host "  $($r.executiveSummary)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Bull Arguments:" -ForegroundColor Green
    $r.bullArguments | ForEach-Object { Write-Host "    [+] $_" -ForegroundColor Green }
    Write-Host ""
    Write-Host "  Bear Arguments:" -ForegroundColor Red
    $r.bearArguments | ForEach-Object { Write-Host "    [-] $_" -ForegroundColor Red }

    Write-Host ""
    Write-Host "TEST 8: Cache hit - same company again" -ForegroundColor Cyan
    $cached = Invoke-RestMethod -Uri "$BASE/api/jobs" -Method POST `
        -ContentType "application/json" `
        -Headers $headers `
        -Body '{"companyName":"Apple Inc"}'
    Write-Host "  Cached: $($cached.cached)" -ForegroundColor $(if ($cached.cached) {"Green"} else {"Red"})
    if ($cached.cached) {
        Write-Host "  Cache HIT - report returned instantly without AI call" -ForegroundColor Green
    }
} elseif ($poll.status -eq "failed") {
    Write-Host ""
    Write-Host "Job FAILED: $($poll.error)" -ForegroundColor Red
} else {
    Write-Host ""
    Write-Host "Job still running after max polls." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "ALL TESTS COMPLETE" -ForegroundColor Cyan
