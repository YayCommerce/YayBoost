#!/bin/bash
#
# YayBoost Release Builder
# Builds plugin and creates distribution-ready zip
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Config
PLUGIN_SLUG="yayboost"
PLUGIN_VERSION=$(grep "Version:" yayboost.php | awk '{print $3}')
BUILD_DIR="release"
TEMP_DIR="${BUILD_DIR}/${PLUGIN_SLUG}"
ZIP_FILE="${BUILD_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.zip"

msg() { echo -e "${2:-$BLUE}$1${NC}"; }
header() { echo "" && msg "━━━ $1 ━━━" "$BLUE" && echo ""; }
ok() { msg "✓ $1" "$GREEN"; }
warn() { msg "⚠ $1" "$YELLOW"; }
fail() { msg "✗ $1" "$RED" && exit 1; }

cleanup() { [ -d "$TEMP_DIR" ] && rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

# Start
clear
header "YayBoost Release Builder v${PLUGIN_VERSION}"

# Prerequisites
header "Checking Prerequisites"
command -v composer &>/dev/null || fail "Composer not installed"
ok "Composer"
command -v pnpm &>/dev/null || fail "pnpm not installed"
ok "pnpm"
command -v zip &>/dev/null || fail "zip not installed"
ok "zip"

# Clean
header "Preparing Build"
rm -rf "$BUILD_DIR"
mkdir -p "$TEMP_DIR"
ok "Build directory created"

# PHP Dependencies (production only - no dev packages)
header "Installing Dependencies"
composer install --no-dev --optimize-autoloader --prefer-dist --quiet
ok "PHP dependencies (production only)"

# Admin Settings Build
msg "Building admin settings..." "$YELLOW"
cd apps/admin-settings
pnpm install --frozen-lockfile --silent
pnpm build --silent 2>/dev/null || pnpm build
cd ../..
[ -f "assets/dist/main.js" ] || fail "Admin build failed"
ok "Admin settings built"

# Blocks Build
msg "Building Gutenberg blocks..." "$YELLOW"
cd apps/blocks
pnpm install --frozen-lockfile --silent 2>/dev/null || pnpm install --silent
pnpm build --silent 2>/dev/null || pnpm build
cd ../..

# Build slots if exists
if [ -d "apps/blocks/slots" ]; then
    cd apps/blocks/slots
    pnpm install --frozen-lockfile --silent 2>/dev/null || pnpm install --silent
    pnpm build --silent 2>/dev/null || pnpm build
    cd ../../..
fi
ok "Gutenberg blocks built"

# Copy Files
header "Copying Plugin Files"
rsync -a \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='.gitattributes' \
    --exclude='.distignore' \
    --exclude='.DS_Store' \
    --exclude='.vscode' \
    --exclude='.idea' \
    --exclude='.claude' \
    --exclude='.opencode' \
    --exclude='apps' \
    --exclude='docs' \
    --exclude='plans' \
    --exclude='tests' \
    --exclude='Sites' \
    --exclude='release' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='*.md' \
    --exclude='repomix-output.xml' \
    --exclude='.repomixignore' \
    --exclude='release.sh' \
    --exclude='run.sh' \
    --exclude='phpcs.xml' \
    --exclude='phpunit.xml' \
    --exclude='composer.json' \
    --exclude='composer.lock' \
    --exclude='package.json' \
    --exclude='package-lock.json' \
    --exclude='pnpm-lock.yaml' \
    --exclude='tsconfig.json' \
    --exclude='vite.config.ts' \
    --exclude='webpack.config.js' \
    . "$TEMP_DIR/"

# Add back README
[ -f "README.md" ] && cp README.md "$TEMP_DIR/"
ok "Files copied"

# Verify
header "Verifying Build"
REQUIRED=(
    "$TEMP_DIR/yayboost.php"
    "$TEMP_DIR/includes/Bootstrap.php"
    "$TEMP_DIR/vendor/autoload.php"
    "$TEMP_DIR/assets/dist/main.js"
)
for file in "${REQUIRED[@]}"; do
    [ -e "$file" ] || fail "Missing: $file"
    ok "Found: $(basename $file)"
done

# Package Size Check
VENDOR_SIZE=$(du -sm "$TEMP_DIR/vendor" | cut -f1)
if [ "$VENDOR_SIZE" -gt 5 ]; then
    warn "vendor/ is ${VENDOR_SIZE}MB - dev packages may be included!"
fi

# Create Zip
header "Creating Package"
cd "$BUILD_DIR"
zip -rq "$(basename $ZIP_FILE)" "$PLUGIN_SLUG"
cd ..
[ -f "$ZIP_FILE" ] || fail "Zip creation failed"

ZIP_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
ok "Created: $ZIP_FILE ($ZIP_SIZE)"

# Checksum
CHECKSUM=$(shasum -a 256 "$ZIP_FILE" | cut -d ' ' -f 1)
echo "$CHECKSUM  $(basename $ZIP_FILE)" > "${ZIP_FILE%.zip}.sha256"
ok "SHA256: ${CHECKSUM:0:16}..."

# Restore Dev Dependencies
header "Restoring Dev Environment"
composer install --quiet
ok "Dev dependencies restored"

# Summary
header "Release Complete!"
echo ""
msg "Package: $ZIP_FILE" "$GREEN"
msg "Size: $ZIP_SIZE" "$GREEN"
msg "Checksum: ${BUILD_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.sha256" "$GREEN"
echo ""
msg "Next steps:" "$YELLOW"
msg "  1. Test: Install $ZIP_FILE on a test site"
msg "  2. Verify all features work correctly"
msg "  3. Upload to WordPress.org or distribution channel"
echo ""
