#!/usr/bin/env powershell
# Create a simple placeholder PNG icon for DashDice

Write-Host "🎨 Creating DashDice placeholder icon..." -ForegroundColor Green

# Create a simple 1024x1024 PNG programmatically using .NET
Add-Type -AssemblyName System.Drawing

# Create a 1024x1024 bitmap
$bitmap = New-Object System.Drawing.Bitmap(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)

# Set high quality rendering
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

# Create gradient background
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(1024, 1024)),
    [System.Drawing.Color]::FromArgb(30, 41, 59),   # Dark blue-gray
    [System.Drawing.Color]::FromArgb(15, 23, 42)    # Very dark blue
)

$graphics.FillRectangle($brush, 0, 0, 1024, 1024)

# Draw dice icon representation
$diceBrush = [System.Drawing.Brushes]::White
$diceSize = 300
$diceX = (1024 - $diceSize) / 2
$diceY = (1024 - $diceSize) / 2

# Draw dice body (rounded rectangle)
$graphics.FillRectangle($diceBrush, $diceX, $diceY, $diceSize, $diceSize)

# Draw dots (simple 6-dot pattern)
$dotBrush = [System.Drawing.Brushes]::Black
$dotSize = 40

# Top row dots
$graphics.FillEllipse($dotBrush, $diceX + 60, $diceY + 60, $dotSize, $dotSize)
$graphics.FillEllipse($dotBrush, $diceX + 200, $diceY + 60, $dotSize, $dotSize)

# Middle row dots  
$graphics.FillEllipse($dotBrush, $diceX + 60, $diceY + 130, $dotSize, $dotSize)
$graphics.FillEllipse($dotBrush, $diceX + 200, $diceY + 130, $dotSize, $dotSize)

# Bottom row dots
$graphics.FillEllipse($dotBrush, $diceX + 60, $diceY + 200, $dotSize, $dotSize)
$graphics.FillEllipse($dotBrush, $diceX + 200, $diceY + 200, $dotSize, $dotSize)

# Add "DD" text below dice
$font = New-Object System.Drawing.Font("Arial", 120, [System.Drawing.FontStyle]::Bold)
$textBrush = [System.Drawing.Brushes]::White
$text = "DD"
$textSize = $graphics.MeasureString($text, $font)
$textX = (1024 - $textSize.Width) / 2
$textY = $diceY + $diceSize + 50

$graphics.DrawString($text, $font, $textBrush, $textX, $textY)

# Save as PNG
$bitmap.Save("c:\Users\david\Documents\dashdice\resources\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

# Clean up
$graphics.Dispose()
$bitmap.Dispose()

Write-Host "✅ Created icon.png in resources folder" -ForegroundColor Green
