#!/bin/bash

# Video Conversion Script for DashDice
# Converts WebM videos to MP4 (H.264) for universal compatibility
# Also generates poster images for loading states

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🎥 DashDice Video Converter"
echo "=========================="
echo ""

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}❌ Error: ffmpeg is not installed${NC}"
    echo "Install ffmpeg:"
    echo "  macOS: brew install ffmpeg"
    echo "  Windows: choco install ffmpeg OR download from https://ffmpeg.org"
    echo "  Linux: sudo apt install ffmpeg"
    exit 1
fi

echo -e "${GREEN}✅ ffmpeg found${NC}"
echo ""

# Function to convert video to MP4
convert_to_mp4() {
    local input="$1"
    local output="$2"
    local preset="${3:-medium}"
    local crf="${4:-23}"
    local scale="${5:-720:-2}"
    
    echo -e "${YELLOW}Converting: $input${NC}"
    
    ffmpeg -i "$input" \
        -c:v libx264 \
        -preset "$preset" \
        -crf "$crf" \
        -profile:v baseline \
        -level 3.0 \
        -pix_fmt yuv420p \
        -vf "scale=$scale" \
        -movflags +faststart \
        -c:a aac -b:a 128k \
        -y \
        "$output" 2>&1 | grep -v "frame=" | grep -v "fps=" | grep -v "time="
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Converted: $output${NC}"
        
        # Get file sizes
        input_size=$(du -h "$input" | cut -f1)
        output_size=$(du -h "$output" | cut -f1)
        echo "   Size: $input_size → $output_size"
        return 0
    else
        echo -e "${RED}❌ Failed: $output${NC}"
        return 1
    fi
}

# Function to generate poster image
generate_poster() {
    local input="$1"
    local output="$2"
    
    echo -e "${YELLOW}Generating poster: $output${NC}"
    
    ffmpeg -i "$input" \
        -ss 00:00:01 \
        -vframes 1 \
        -vf "scale=720:-2" \
        -y \
        "$output" 2>&1 | grep -v "frame="
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Poster created: $output${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed: $output${NC}"
        return 1
    fi
}

# Navigate to public directory
cd "public" || {
    echo -e "${RED}❌ Error: public directory not found${NC}"
    echo "Run this script from the project root"
    exit 1
}

echo "📁 Working directory: $(pwd)"
echo ""

# ============================================================================
# CRITICAL: Ability Animations (smallest, highest priority)
# ============================================================================
echo "🎯 Converting Ability Animations (CRITICAL)"
echo "==========================================="

# Pan Slap
if [ -f "Abilities/Animations/Pan Slap.webm" ]; then
    convert_to_mp4 \
        "Abilities/Animations/Pan Slap.webm" \
        "Abilities/Animations/Pan Slap.mp4" \
        "slow" "20" "720:-2"
    
    generate_poster \
        "Abilities/Animations/Pan Slap.mp4" \
        "Abilities/Animations/Pan Slap-poster.jpg"
else
    echo -e "${YELLOW}⚠️  Pan Slap.webm not found${NC}"
fi
echo ""

# Luck Turner
if [ -f "Abilities/Animations/Luck Turner Animation.webm" ]; then
    convert_to_mp4 \
        "Abilities/Animations/Luck Turner Animation.webm" \
        "Abilities/Animations/Luck Turner Animation.mp4" \
        "slow" "20" "720:-2"
    
    generate_poster \
        "Abilities/Animations/Luck Turner Animation.mp4" \
        "Abilities/Animations/Luck Turner Animation-poster.jpg"
else
    echo -e "${YELLOW}⚠️  Luck Turner Animation.webm not found${NC}"
fi
echo ""

# ============================================================================
# Match Multiplier Animations
# ============================================================================
echo "🎲 Converting Match Animations"
echo "=============================="

for multi in x2multi x3multi x4multi; do
    if [ -f "Animations/${multi}.webm" ]; then
        convert_to_mp4 \
            "Animations/${multi}.webm" \
            "Animations/${multi}.mp4" \
            "slow" "18" "480:-2"
        
        generate_poster \
            "Animations/${multi}.mp4" \
            "Animations/${multi}-poster.jpg"
    else
        echo -e "${YELLOW}⚠️  ${multi}.webm not found${NC}"
    fi
    echo ""
done

# ============================================================================
# Background Videos (larger, mobile versions)
# ============================================================================
echo "🖼️  Converting Background Videos"
echo "================================"

backgrounds=("New Day" "On A Mission" "Underwater" "As they fall" "End of the Dragon")

for bg in "${backgrounds[@]}"; do
    # Desktop version
    if [ -f "backgrounds/${bg}.mp4" ]; then
        echo -e "${GREEN}✅ Desktop version already exists: ${bg}.mp4${NC}"
    elif [ -f "backgrounds/${bg}.webm" ]; then
        convert_to_mp4 \
            "backgrounds/${bg}.webm" \
            "backgrounds/${bg}.mp4" \
            "medium" "23" "1280:-2"
    fi
    
    # Mobile version
    mobile_name="${bg} - Mobile"
    if [ -f "backgrounds/Mobile/${bg}-Mobile.webm" ] || [ -f "backgrounds/Mobile/${mobile_name}.webm" ]; then
        webm_file=$(ls backgrounds/Mobile/${bg}*Mobile.webm 2>/dev/null | head -1)
        if [ -n "$webm_file" ]; then
            convert_to_mp4 \
                "$webm_file" \
                "backgrounds/Mobile/${bg}-Mobile.mp4" \
                "medium" "28" "720:-2"
        fi
    fi
    
    # Preview version
    if [ -f "backgrounds/Preview/${bg}*Preview.webm" ]; then
        preview_file=$(ls backgrounds/Preview/${bg}*Preview.webm 2>/dev/null | head -1)
        if [ -n "$preview_file" ]; then
            convert_to_mp4 \
                "$preview_file" \
                "backgrounds/Preview/${bg}-Preview.mp4" \
                "slow" "25" "480:-2"
            
            generate_poster \
                "backgrounds/Preview/${bg}-Preview.mp4" \
                "backgrounds/Preview/${bg}-Preview.jpg"
        fi
    fi
    
    echo ""
done

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "================================"
echo "🎉 Conversion Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Test videos on mobile devices (Chrome + Safari)"
echo "2. Update components to use VideoPlayer component"
echo "3. Deploy to Vercel"
echo ""
echo "Quick test commands:"
echo "  - Chrome DevTools: Network tab → Throttle to 3G"
echo "  - Safari: Develop → User Agent → iPhone"
echo ""
