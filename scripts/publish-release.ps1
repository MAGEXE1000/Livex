# scripts/publish-release.ps1
# Automate version bump, git push, GitHub workflow trigger, monitoring, and post-deploy verification.

param (
    [string]$BumpType = "patch",
    [string]$ReleaseNote = "Automated release via Single Source of Truth architecture.",
    [switch]$SkipBump = $false
)

if (-not $SkipBump) {
    # 1. Single Source of Truth Version Bump
    Write-Host "1. Bumping Single Source of Truth (root package.json)..."
    $npmResult = npm.cmd version $BumpType --no-git-tag-version
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to bump root package.json version."
        exit 1
    }

    $VersionName = $npmResult.Trim().Substring(1) # Remove 'v' prefix
    Write-Host "New Version: $VersionName"

    # 2. Synchronize versions across the repository
    Write-Host "2. Synchronizing version across all manifests..."
    node scripts/sync-versions.mjs
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to synchronize versions."
        exit 1
    }

    # 3. Commit and push
    $BranchName = (git symbolic-ref --short HEAD).Trim()
    Write-Host "Current branch: $BranchName"

    Write-Host "3. Committing and pushing version changes to Git..."
    git add -u

    if (git diff --staged --quiet) {
        Write-Host "No changes to commit."
    } else {
        git commit -m "Release v${VersionName} - ${ReleaseNote}" --no-verify
    }

    Write-Host "Pushing HEAD to origin/$BranchName..."
    git push origin HEAD
} else {
    $VersionName = (node scripts/get-version.mjs).Trim()
    $BranchName = (git symbolic-ref --short HEAD).Trim()
    Write-Host "Skipping bump. Current version: $VersionName on branch $BranchName"
}

# 4. Trigger Pipeline
Write-Host "4. Triggering GitHub Actions Release Pipeline on branch $BranchName..."
gh workflow run release.yml --ref $BranchName -f note="$ReleaseNote"

Write-Host "Waiting 15 seconds for the workflow run to initialize..."
Start-Sleep -Seconds 15

# 5. Monitor Pipeline
Write-Host "5. Finding the active workflow run..."
$CommitSha = (git rev-parse HEAD).Trim()
$RunId = $null
$RunStatusLabel = "unknown"
for ($attempt = 1; $attempt -le 12; $attempt++) {
    $Runs = gh run list --workflow=release.yml --commit $CommitSha --json databaseId,status,conclusion | ConvertFrom-Json
    if ($Runs -and $Runs.Length -gt 0) {
        $RunId = $Runs[0].databaseId
        $RunStatusLabel = $Runs[0].status
        break
    }
    Write-Host "Waiting for new run to register on commit $CommitSha (attempt $attempt/12)..."
    Start-Sleep -Seconds 10
}

if (-not $RunId) {
    Write-Error "Could not find any runs for release.yml on commit $CommitSha after waiting. Aborting safely to prevent duplicate executions."
    exit 1
}
Write-Host "Found run ID: $RunId. Status: $RunStatusLabel"

Write-Host "6. Monitoring workflow run $RunId until completion..."
while ($true) {
    $RunStatus = gh run view $RunId --json status,conclusion | ConvertFrom-Json
    $Status = $RunStatus.status
    $Conclusion = $RunStatus.conclusion
    Write-Host "$(Get-Date -Format 'HH:mm:ss') - Status: $Status, Conclusion: $Conclusion"
    if ($Status -eq "completed") {
        if ($Conclusion -ne "success") {
            Write-Error "Workflow failed with conclusion: $Conclusion"
            exit 1
        }
        break
    }
    Start-Sleep -Seconds 20
}

# 6. Verify Artifacts
Write-Host "7. Verifying GitHub Release..."
$Release = gh release view "v$VersionName" --json assets | ConvertFrom-Json
if (-not $Release) {
    Write-Error "GitHub Release v$VersionName not found!"
    exit 1
}
Write-Host "GitHub Release v$VersionName exists."

$ApkAsset = $Release.assets | Where-Object { $_.name -eq "studio-$VersionName.apk" }
if (-not $ApkAsset) {
    Write-Error "Release APK asset studio-$VersionName.apk not found!"
    exit 1
}
Write-Host "Release APK asset exists."

$ShaAsset = $Release.assets | Where-Object { $_.name -eq "studio-$VersionName.sha256" }
if (-not $ShaAsset) {
    Write-Error "Release SHA asset studio-$VersionName.sha256 not found!"
    exit 1
}
Write-Host "Release SHA asset exists."

Write-Host "8. Verifying Firebase Metadata & In-App Updater..."
$verifiedAppRelease = $false
for ($i = 1; $i -le 8; $i++) {
    Write-Host "Fetching app-release.json from production (attempt $i/8)..."
    try {
        $AppReleaseJson = Invoke-RestMethod -Uri "https://studio-30f44.web.app/app-release.json?t=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" -Headers @{ "Cache-Control" = "no-cache" }
        Write-Host "Production app-release.json version: $($AppReleaseJson.version), versionCode: $($AppReleaseJson.versionCode)"
        if ($AppReleaseJson.version -eq $VersionName) {
            $verifiedAppRelease = $true
            break
        }
    } catch {
        Write-Warning "Failed to fetch app-release.json: $_"
    }
    Start-Sleep -Seconds 5
}
if (-not $verifiedAppRelease) {
    Write-Error "Production app-release.json version mismatch! Expected $VersionName, got $($AppReleaseJson.version)"
    exit 1
}

$verifiedVersionJson = $false
for ($i = 1; $i -le 8; $i++) {
    Write-Host "Fetching version.json from production (attempt $i/8)..."
    try {
        $VersionJson = Invoke-RestMethod -Uri "https://studio-30f44.web.app/version.json?t=$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())" -Headers @{ "Cache-Control" = "no-cache" }
        Write-Host "Production version.json version: $($VersionJson.version)"
        if ($VersionJson.version -eq $VersionName) {
            $verifiedVersionJson = $true
            break
        }
    } catch {
        Write-Warning "Failed to fetch version.json: $_"
    }
    Start-Sleep -Seconds 5
}
if (-not $verifiedVersionJson) {
    Write-Error "Production version.json version mismatch! Expected $VersionName, got $($VersionJson.version)"
    exit 1
}

Write-Host "SUCCESS: Release v$VersionName successfully published and verified!"
