#!/usr/bin/env powershell
# Generate iOS app icons manually

Write-Host "🍎 Generating iOS App Icons..." -ForegroundColor Green

# Required iOS icon sizes
$iosSizes = @(
    @{size=20; scale=2; name="icon-20@2x.png"},
    @{size=20; scale=3; name="icon-20@3x.png"},
    @{size=29; scale=2; name="icon-29@2x.png"},
    @{size=29; scale=3; name="icon-29@3x.png"},
    @{size=40; scale=2; name="icon-40@2x.png"},
    @{size=40; scale=3; name="icon-40@3x.png"},
    @{size=60; scale=2; name="icon-60@2x.png"},
    @{size=60; scale=3; name="icon-60@3x.png"},
    @{size=20; scale=1; name="icon-20.png"},
    @{size=20; scale=2; name="icon-20@2x-1.png"},
    @{size=29; scale=1; name="icon-29.png"},
    @{size=29; scale=2; name="icon-29@2x-1.png"},
    @{size=40; scale=1; name="icon-40.png"},
    @{size=40; scale=2; name="icon-40@2x-1.png"},
    @{size=76; scale=1; name="icon-76.png"},
    @{size=76; scale=2; name="icon-76@2x.png"},
    @{size=83.5; scale=2; name="icon-83.5@2x.png"},
    @{size=1024; scale=1; name="icon-1024.png"}
)

Add-Type -AssemblyName System.Drawing

# Load source icon
$sourceIcon = [System.Drawing.Image]::FromFile("c:\Users\david\Documents\dashdice\resources\icon.png")

$iconsetPath = "c:\Users\david\Documents\dashdice\ios\App\App\Assets.xcassets\AppIcon.appiconset"

foreach ($iconInfo in $iosSizes) {
    $pixelSize = [int]($iconInfo.size * $iconInfo.scale)
    $fileName = $iconInfo.name
    $fullPath = Join-Path $iconsetPath $fileName
    
    Write-Host "Creating $fileName (${pixelSize}x${pixelSize})" -ForegroundColor Cyan
    
    # Create resized bitmap
    $resized = New-Object System.Drawing.Bitmap($pixelSize, $pixelSize)
    $graphics = [System.Drawing.Graphics]::FromImage($resized)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Draw the resized icon
    $graphics.DrawImage($sourceIcon, 0, 0, $pixelSize, $pixelSize)
    
    # Save as PNG
    $resized.Save($fullPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Clean up
    $graphics.Dispose()
    $resized.Dispose()
}

$sourceIcon.Dispose()

Write-Host "✅ Generated all iOS app icons!" -ForegroundColor Green
