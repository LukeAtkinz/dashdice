# Video Conversion Script for DashDice (PowerShell)
# Converts WebM videos to MP4 (H.264) for universal compatibility
# Also generates poster images for loading states

Write-Host "🎥 DashDice Video Converter" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Check if ffmpeg is installed
$ffmpegInstalled = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpegInstalled) {
    Write-Host "❌ Error: ffmpeg is not installed" -ForegroundColor Red
    Write-Host "Install ffmpeg:"
    Write-Host "  Windows: choco install ffmpeg"
    Write-Host "  OR download from: https://ffmpeg.org/download.html"
    Write-Host ""
    Write-Host "Quick install with Chocolatey:"
    Write-Host "  1. Install Chocolatey: https://chocolatey.org/install"
    Write-Host "  2. Run: choco install ffmpeg"
    exit 1
}

Write-Host "✅ ffmpeg found" -ForegroundColor Green
Write-Host ""

# Function to convert video to MP4
function Convert-ToMP4 {
    param(
        [string]$InputPath,
        [string]$Output,
        [string]$Preset = "medium",
        [string]$CRF = "23",
        [string]$Scale = "720:-2"
    )
    
    Write-Host "Converting: $InputPath" -ForegroundColor Yellow
    
    $arguments = @(
        "-i", $InputPath,
        "-c:v", "libx264",
        "-preset", $Preset,
        "-crf", $CRF,
        "-profile:v", "baseline",
        "-level", "3.0",
        "-pix_fmt", "yuv420p",
        "-vf", "scale=$Scale",
        "-movflags", "+faststart",
        "-c:a", "aac",
        "-b:a", "128k",
        "-y",
        $Output
    )
    
    & ffmpeg @arguments 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Converted: $Output" -ForegroundColor Green
        
        # Get file sizes
        $inputSize = (Get-Item $InputPath).Length / 1MB
        $outputSize = (Get-Item $Output).Length / 1MB
        Write-Host "   Size: $([math]::Round($inputSize, 2))MB → $([math]::Round($outputSize, 2))MB"
        return $true
    } else {
        Write-Host "❌ Failed: $Output" -ForegroundColor Red
        return $false
    }
}

# Function to generate poster image
function New-Poster {
    param(
        [string]$InputPath,
        [string]$Output
    )
    
    Write-Host "Generating poster: $Output" -ForegroundColor Yellow
    
    $arguments = @(
        "-i", $InputPath,
        "-ss", "00:00:01",
        "-vframes", "1",
        "-vf", "scale=720:-2",
        "-y",
        $Output
    )
    
    & ffmpeg @arguments 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Poster created: $Output" -ForegroundColor Green
        return $true
    } else {
        Write-Host "❌ Failed: $Output" -ForegroundColor Red
        return $false
    }
}

# Navigate to public directory
if (-not (Test-Path "public")) {
    Write-Host "❌ Error: public directory not found" -ForegroundColor Red
    Write-Host "Run this script from the project root"
    exit 1
}

Set-Location "public"
Write-Host "📁 Working directory: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# CRITICAL: Ability Animations (smallest, highest priority)
# ============================================================================
Write-Host "🎯 Converting Ability Animations (CRITICAL)" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Pan Slap
$panSlapWebm = "Abilities\Animations\Pan Slap.webm"
if (Test-Path $panSlapWebm) {
    Convert-ToMP4 `
        -InputPath $panSlapWebm `
        -Output "Abilities\Animations\Pan Slap.mp4" `
        -Preset "slow" `
        -CRF "20" `
        -Scale "720:-2"
    
    New-Poster `
        -InputPath "Abilities\Animations\Pan Slap.mp4" `
        -Output "Abilities\Animations\Pan Slap-poster.jpg"
} else {
    Write-Host "⚠️  Pan Slap.webm not found" -ForegroundColor Yellow
}
Write-Host ""

# Luck Turner
$luckTurnerWebm = "Abilities\Animations\Luck Turner Animation.webm"
if (Test-Path $luckTurnerWebm) {
    Convert-ToMP4 `
        -InputPath $luckTurnerWebm `
        -Output "Abilities\Animations\Luck Turner Animation.mp4" `
        -Preset "slow" `
        -CRF "20" `
        -Scale "720:-2"
    
    New-Poster `
        -InputPath "Abilities\Animations\Luck Turner Animation.mp4" `
        -Output "Abilities\Animations\Luck Turner Animation-poster.jpg"
} else {
    Write-Host "⚠️  Luck Turner Animation.webm not found" -ForegroundColor Yellow
}
Write-Host ""

# ============================================================================
# Match Multiplier Animations
# ============================================================================
Write-Host "🎲 Converting Match Animations" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

$multipliers = @("x2multi", "x3multi", "x4multi")
foreach ($multi in $multipliers) {
    $webmPath = "Animations\$multi.webm"
    if (Test-Path $webmPath) {
        Convert-ToMP4 `
            -InputPath $webmPath `
            -Output "Animations\$multi.mp4" `
            -Preset "slow" `
            -CRF "18" `
            -Scale "480:-2"
        
        New-Poster `
            -InputPath "Animations\$multi.mp4" `
            -Output "Animations\$multi-poster.jpg"
    } else {
        Write-Host "⚠️  $multi.webm not found" -ForegroundColor Yellow
    }
    Write-Host ""
}

# ============================================================================
# Background Videos
# ============================================================================
Write-Host "🖼️  Converting Background Videos" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$backgrounds = @("New Day", "On A Mission", "Underwater", "As they fall", "End of the Dragon")

foreach ($bg in $backgrounds) {
    Write-Host "Processing: $bg" -ForegroundColor Cyan
    
    # Desktop version
    $desktopMp4 = "backgrounds\$bg.mp4"
    $desktopWebm = "backgrounds\$bg.webm"
    
    if (Test-Path $desktopMp4) {
        Write-Host "✅ Desktop version already exists: $bg.mp4" -ForegroundColor Green
    } elseif (Test-Path $desktopWebm) {
        Convert-ToMP4 `
            -InputPath $desktopWebm `
            -Output $desktopMp4 `
            -Preset "medium" `
            -CRF "23" `
            -Scale "1280:-2"
    }
    
    # Mobile version - try different naming patterns
    $mobilePatterns = @(
        "backgrounds\Mobile\$bg - Mobile.webm",
        "backgrounds\Mobile\$bg-Mobile.webm",
        "backgrounds\Mobile\${bg}Mobile.webm"
    )
    
    foreach ($pattern in $mobilePatterns) {
        if (Test-Path $pattern) {
            $mobileOutput = "backgrounds\Mobile\$bg-Mobile.mp4"
            Convert-ToMP4 `
                -InputPath $pattern `
                -Output $mobileOutput `
                -Preset "medium" `
                -CRF "28" `
                -Scale "720:-2"
            break
        }
    }
    
    # Preview version
    $previewPattern = Get-ChildItem -Path "backgrounds\Preview" -Filter "*$bg*Preview.webm" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($previewPattern) {
        $previewOutput = "backgrounds\Preview\$bg-Preview.mp4"
        Convert-ToMP4 `
            -InputPath $previewPattern.FullName `
            -Output $previewOutput `
            -Preset "slow" `
            -CRF "25" `
            -Scale "480:-2"
        
        New-Poster `
            -InputPath $previewOutput `
            -Output "backgrounds\Preview\$bg-Preview.jpg"
    }
    
    Write-Host ""
}

# Return to original directory
Set-Location ..

# ============================================================================
# Summary
# ============================================================================
Write-Host ""
Write-Host "================================" -ForegroundColor Green
Write-Host "🎉 Conversion Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test videos on mobile devices (Chrome + Safari)"
Write-Host "2. Update components to use VideoPlayer component"
Write-Host "3. Deploy to Vercel"
Write-Host ""
Write-Host "Quick test commands:" -ForegroundColor Yellow
Write-Host "  - Chrome DevTools: Network tab → Throttle to 3G"
Write-Host "  - Safari: Develop → User Agent → iPhone"
Write-Host ""
Write-Host "Verify converted files:" -ForegroundColor Yellow
Write-Host "  Get-ChildItem -Path public\Abilities\Animations\*.mp4 -Recurse"
Write-Host "  Get-ChildItem -Path public\Animations\*.mp4"
Write-Host ""
