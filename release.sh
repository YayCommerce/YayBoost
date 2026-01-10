#!/bin/bash

# YayBoost Release Script
# This script builds the plugin and creates a distribution-ready zip file

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Plugin information
PLUGIN_SLUG="yayboost"
PLUGIN_VERSION=$(grep "Version:" yayboost.php | awk '{print $3}')
BUILD_DIR="release"
TEMP_DIR="${BUILD_DIR}/temp"
ZIP_FILE="${BUILD_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.zip"

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print section header
print_header() {
    echo ""
    print_message "${BLUE}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_message "${BLUE}" "  $1"
    print_message "${BLUE}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# Function to clean up
cleanup() {
    if [ -d "$TEMP_DIR" ]; then
        print_message "${YELLOW}" "🧹 Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
    fi
}

# Trap to ensure cleanup happens even if script fails
trap cleanup EXIT

# Start release process
clear
print_header "🚀 YayBoost Release Builder v${PLUGIN_VERSION}"

# Step 1: Check prerequisites
print_header "📋 Checking Prerequisites"

if ! command -v composer &> /dev/null; then
    print_message "${RED}" "❌ Error: Composer is not installed"
    exit 1
fi
print_message "${GREEN}" "✓ Composer found"

if ! command -v pnpm &> /dev/null; then
    print_message "${RED}" "❌ Error: pnpm is not installed"
    exit 1
fi
print_message "${GREEN}" "✓ pnpm found"

if ! command -v zip &> /dev/null; then
    print_message "${RED}" "❌ Error: zip is not installed"
    exit 1
fi
print_message "${GREEN}" "✓ zip found"

# Step 2: Clean previous builds
print_header "🧹 Cleaning Previous Builds"

if [ -d "$BUILD_DIR" ]; then
    print_message "${YELLOW}" "Removing previous build directory..."
    rm -rf "$BUILD_DIR"
fi

mkdir -p "$BUILD_DIR"
mkdir -p "$TEMP_DIR"
print_message "${GREEN}" "✓ Build directories created"

# Step 3: Install production dependencies
print_header "📦 Installing Production Dependencies"

print_message "${YELLOW}" "Installing PHP dependencies (production only)..."
composer install --no-dev --optimize-autoloader --prefer-dist
print_message "${GREEN}" "✓ PHP dependencies installed"

print_message "${YELLOW}" "Installing JavaScript dependencies..."
cd apps/admin-settings
pnpm install --frozen-lockfile
print_message "${GREEN}" "✓ Admin settings dependencies installed"
cd ../..

print_message "${YELLOW}" "Installing blocks dependencies..."
cd apps/blocks
pnpm install --frozen-lockfile
cd slots
pnpm install --frozen-lockfile 2>/dev/null || pnpm install --force
cd ../../..
print_message "${GREEN}" "✓ Blocks dependencies installed"

# Step 4: Build frontend assets
print_header "⚡ Building Frontend Assets"

print_message "${YELLOW}" "Building admin settings with Vite..."
cd apps/admin-settings
pnpm build

if [ ! -f "../../assets/dist/main.js" ]; then
    print_message "${RED}" "❌ Error: Admin build failed - main.js not found"
    cd ../..
    exit 1
fi
print_message "${GREEN}" "✓ Admin settings built successfully"
cd ../..

print_message "${YELLOW}" "Building Gutenberg blocks..."
cd apps/blocks
pnpm install --frozen-lockfile
pnpm build:all

if [ ! -d "../../assets/dist/blocks" ]; then
    print_message "${RED}" "❌ Error: Blocks build failed - blocks directory not found"
    cd ../..
    exit 1
fi
print_message "${GREEN}" "✓ Gutenberg blocks built successfully"
cd ../..

# Step 5: Copy plugin files
print_header "📁 Copying Plugin Files"

print_message "${YELLOW}" "Copying files to temporary directory..."

# Create plugin directory in temp
mkdir -p "${TEMP_DIR}/${PLUGIN_SLUG}"

# Copy files while respecting .distignore
rsync -av \
    --exclude-from='.distignore' \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='.distignore' \
    --exclude='release.sh' \
    --exclude='release' \
    --exclude='run.sh' \
    --exclude='apps' \
    --exclude='node_modules' \
    --exclude='package.json' \
    --exclude='package-lock.json' \
    --exclude='pnpm-lock.yaml' \
    --exclude='.DS_Store' \
    --exclude='.vscode' \
    --exclude='phpcs.xml' \
    --exclude='*.log' \
    . "${TEMP_DIR}/${PLUGIN_SLUG}/"

print_message "${GREEN}" "✓ Files copied successfully"

# Step 6: Verify critical files
print_header "✅ Verifying Build"

REQUIRED_FILES=(
    "${TEMP_DIR}/${PLUGIN_SLUG}/yayboost.php"
    "${TEMP_DIR}/${PLUGIN_SLUG}/includes/Bootstrap.php"
    "${TEMP_DIR}/${PLUGIN_SLUG}/vendor/autoload.php"
    "${TEMP_DIR}/${PLUGIN_SLUG}/assets/dist"
)

ALL_PRESENT=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        print_message "${RED}" "❌ Missing required file: $file"
        ALL_PRESENT=false
    else
        print_message "${GREEN}" "✓ Found: $(basename $file)"
    fi
done

if [ "$ALL_PRESENT" = false ]; then
    print_message "${RED}" "❌ Build verification failed"
    exit 1
fi

# Step 7: Create zip file
print_header "📦 Creating Distribution Package"

print_message "${YELLOW}" "Creating zip file: ${ZIP_FILE}..."
cd "$TEMP_DIR"
zip -r "../$(basename $ZIP_FILE)" "${PLUGIN_SLUG}" -q

cd ../..

if [ ! -f "$ZIP_FILE" ]; then
    print_message "${RED}" "❌ Error: Failed to create zip file"
    exit 1
fi

ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
print_message "${GREEN}" "✓ Zip file created successfully (${ZIP_SIZE})"

# Step 8: Generate checksum
print_header "🔐 Generating Checksum"

CHECKSUM=$(shasum -a 256 "$ZIP_FILE" | cut -d ' ' -f 1)
print_message "${GREEN}" "✓ SHA256: ${CHECKSUM}"

# Save checksum to file
echo "${CHECKSUM}  $(basename $ZIP_FILE)" > "${BUILD_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.sha256"
print_message "${GREEN}" "✓ Checksum saved to ${BUILD_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.sha256"

# Step 9: Reinstall dev dependencies
print_header "🔄 Restoring Development Environment"

print_message "${YELLOW}" "Reinstalling development dependencies..."
composer install
print_message "${GREEN}" "✓ Development dependencies restored"

# Final summary
print_header "🎉 Build Complete!"

echo ""
print_message "${GREEN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_message "${GREEN}" "  Release package created successfully!"
print_message "${GREEN}" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_message "${BLUE}" "📦 Package: ${ZIP_FILE}"
print_message "${BLUE}" "📊 Size: ${ZIP_SIZE}"
print_message "${BLUE}" "🔐 Checksum: ${CHECKSUM}"
echo ""
print_message "${YELLOW}" "Next steps:"
print_message "${YELLOW}" "  1. Test the plugin by installing ${ZIP_FILE}"
print_message "${YELLOW}" "  2. Verify all features work correctly"
print_message "${YELLOW}" "  3. Upload to WordPress.org or distribution channel"
echo ""

# Cleanup happens automatically via trap

