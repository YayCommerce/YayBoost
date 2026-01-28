#!/bin/bash
#
# YayBoost Release Script
# Usage: ./scripts/release.sh [command] [options]
#
# Commands:
#   package [version]  - Create Pro release ZIP package
#   package-free       - Create Free release ZIP package
#   bump <version>     - Bump version number
#   info               - Show current version info
#   help               - Show this help message
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory and plugin root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$(dirname "$SCRIPT_DIR")"
ADMIN_DIR="$PLUGIN_DIR/apps/admin-settings"
BLOCKS_DIR="$PLUGIN_DIR/apps/blocks"
RELEASE_DIR="$PLUGIN_DIR/release"
PLUGIN_SLUG="yayboost"
RELEASE_SLUG="yayboost"  # Folder name in ZIP package
MAIN_FILE="$PLUGIN_DIR/$PLUGIN_SLUG.php"

# Validate critical paths
validate_paths() {
    if [ -z "$PLUGIN_DIR" ] || [ "$PLUGIN_DIR" = "/" ] || [ ! -f "$MAIN_FILE" ]; then
        echo "ERROR: Invalid plugin directory: '$PLUGIN_DIR'" >&2
        exit 1
    fi
}
validate_paths

# Print colored message
print_msg() {
    local color=$1
    local msg=$2
    echo -e "${color}${msg}${NC}"
}

print_step() {
    print_msg "$BLUE" "→ $1"
}

print_success() {
    print_msg "$GREEN" "✓ $1"
}

print_error() {
    print_msg "$RED" "✗ $1"
}

print_warning() {
    print_msg "$YELLOW" "⚠ $1"
}

print_info() {
    print_msg "$CYAN" "ℹ $1"
}

# Portable in-place sed edit (macOS/Linux compatible)
sed_inplace() {
    local pattern=$1
    local file=$2
    if sed --version 2>&1 | grep -q GNU; then
        sed -i "$pattern" "$file"
    else
        sed -i '' "$pattern" "$file"
    fi
}

# Get current version from main plugin file
get_version() {
    echo "1.0.12"
}

# Update version in all relevant files
update_version() {
    local new_version=$1
    # Escape special chars for sed
    local safe_version
    safe_version=$(echo "$new_version" | sed 's/[\/&]/\\&/g')

    print_step "Updating version to $new_version..."

    # Update main plugin file - Version header
    sed_inplace "s/\* Version: .*/\* Version: $safe_version/" "$MAIN_FILE"

    # Update main plugin file - YAYBOOST_VERSION constant
    sed_inplace "s/define('YAYBOOST_VERSION', '.*')/define('YAYBOOST_VERSION', '$safe_version')/" "$MAIN_FILE"

    # Update README.md version if exists
    if [ -f "$PLUGIN_DIR/README.md" ]; then
        sed_inplace "s/\*\*Version:\*\* .*/\*\*Version:\*\* $safe_version/" "$PLUGIN_DIR/README.md"
    fi

    print_success "Version updated to $new_version"
}

# Check if pnpm is installed
check_pnpm() {
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install it first:"
        echo "  npm install -g pnpm"
        exit 1
    fi
}

# Build admin dashboard
build_admin() {
    print_step "Building admin dashboard..."
    check_pnpm

    cd "$ADMIN_DIR"

    # Install deps if needed
    if [ ! -d "node_modules" ]; then
        print_step "Installing dependencies..."
        pnpm install
    fi

    # TypeScript check
    print_step "Running TypeScript type check..."
    if ! pnpm tsc --noEmit; then
        print_error "TypeScript check failed. Fix errors before releasing."
        exit 1
    fi

    # Build
    pnpm build

    print_success "Admin dashboard built"
}

# Build blocks (Gutenberg blocks + WooCommerce slots)
build_blocks() {
    print_step "Building blocks..."
    check_pnpm

    cd "$BLOCKS_DIR"

    # Install deps if needed
    if [ ! -d "node_modules" ]; then
        print_step "Installing blocks dependencies..."
        pnpm install
    fi

    # Install slots deps if needed
    if [ ! -d "slots/node_modules" ]; then
        print_step "Installing slots dependencies..."
        cd slots && pnpm install && cd ..
    fi

    # Build all blocks (blocks + slots)
    pnpm build:all

    print_success "Blocks built"
}

# Create release package
cmd_package() {
    local version=${1:-$(get_version)}
    local zip_name="${RELEASE_SLUG}-${version}.zip"

    print_msg "$CYAN" "╔════════════════════════════════════════════╗"
    print_msg "$CYAN" "║       YayBoost Release Packager          ║"
    print_msg "$CYAN" "╚════════════════════════════════════════════╝"
    echo ""
    print_info "Version: $version"
    print_info "Output: release/$zip_name"
    echo ""

    # Create release directory
    mkdir -p "$RELEASE_DIR"

    # Build admin
    build_admin

    # Build blocks
    build_blocks

    # Create temp directory for package (uses RELEASE_SLUG for folder name)
    local temp_dir="$RELEASE_DIR/$RELEASE_SLUG"
    rm -rf "$temp_dir"
    mkdir -p "$temp_dir"

    print_step "Copying plugin files..."

    # Copy main files
    cp "$MAIN_FILE" "$temp_dir/"

    # Set YAYBOOST_IS_DEVELOPMENT to false for release
    print_step "Setting production mode..."
    sed_inplace "s/define( 'YAYBOOST_IS_DEVELOPMENT', true )/define( 'YAYBOOST_IS_DEVELOPMENT', false )/" "$temp_dir/$PLUGIN_SLUG.php"

    # Copy directories
    cp -r "$PLUGIN_DIR/assets" "$temp_dir/"
    cp -r "$PLUGIN_DIR/includes" "$temp_dir/"

    # Copy only essential vendor files (autoload.php and composer directory)
    mkdir -p "$temp_dir/vendor"
    cp "$PLUGIN_DIR/vendor/autoload.php" "$temp_dir/vendor/"
    cp -r "$PLUGIN_DIR/vendor/composer" "$temp_dir/vendor/"

    # Remove dev files from copied assets
    rm -rf "$temp_dir/assets/admin/dist/.vite" 2>/dev/null || true

    # Copy README if exists (but not development docs)
    if [ -f "$PLUGIN_DIR/README.md" ]; then
        cp "$PLUGIN_DIR/README.md" "$temp_dir/"
    fi

    # Remove files that shouldn't be in release
    find "$temp_dir" -name ".DS_Store" -delete 2>/dev/null || true
    find "$temp_dir" -name "*.map" -delete 2>/dev/null || true

    print_step "Creating ZIP archive..."

    # Create ZIP
    cd "$RELEASE_DIR"
    rm -f "$zip_name"
    zip -r -q "$zip_name" "$RELEASE_SLUG"

    # Cleanup temp directory
    rm -rf "$temp_dir"

    # Get file size
    local size=$(du -h "$zip_name" | cut -f1)

    echo ""
    print_success "Release package created!"
    echo ""
    print_info "Package: $RELEASE_DIR/$zip_name"
    print_info "Size: $size"
    echo ""

    # List package contents
    print_step "Package contents:"
    unzip -l "$zip_name" | head -20
    echo "  ..."
    echo ""
}

# Create free version package
cmd_package_free() {
    print_msg "$CYAN" "╔════════════════════════════════════════════╗"
    print_msg "$CYAN" "║      YayBoost Free Version Builder       ║"
    print_msg "$CYAN" "╚════════════════════════════════════════════╝"
    echo ""

    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi

    # Run the Node.js build script
    print_step "Running free version build script..."
    node "$SCRIPT_DIR/build-free.js" "$@"
}

# Bump version
cmd_bump() {
    local new_version=$1

    if [ -z "$new_version" ]; then
        print_error "Please provide a version number"
        echo "Usage: ./scripts/release.sh bump <version>"
        echo "Example: ./scripts/release.sh bump 1.0.5"
        exit 1
    fi

    # Validate version format
    if ! [[ "$new_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
        print_error "Invalid version format. Use: X.Y.Z or X.Y.Z-tag"
        echo "Examples: 1.0.5, 1.1.0-beta, 2.0.0-rc1"
        exit 1
    fi

    local current=$(get_version)
    print_info "Current version: $current"
    print_info "New version: $new_version"
    echo ""

    read -p "Proceed with version bump? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        update_version "$new_version"
    else
        print_warning "Version bump cancelled"
    fi
}

# Show version info
cmd_info() {
    local version=$(get_version)

    print_msg "$CYAN" "╔════════════════════════════════════════════╗"
    print_msg "$CYAN" "║          YayBoost Plugin Info            ║"
    print_msg "$CYAN" "╚════════════════════════════════════════════╝"
    echo ""
    print_info "Plugin: YayBoost"
    print_info "Dev Slug: $PLUGIN_SLUG"
    print_info "Release Slug: $RELEASE_SLUG"
    print_info "Version: $version"
    print_info "Plugin Dir: $PLUGIN_DIR"
    echo ""

    # Check if admin build exists
    if [ -d "$PLUGIN_DIR/assets/admin/dist" ]; then
        print_success "Admin dashboard: Built"
    else
        print_warning "Admin dashboard: Not built (run ./scripts/build.sh build)"
    fi

    # Check for existing releases
    if [ -d "$RELEASE_DIR" ]; then
        local releases=$(ls -1 "$RELEASE_DIR"/*.zip 2>/dev/null | wc -l | tr -d ' ')
        if [ "$releases" -gt 0 ]; then
            echo ""
            print_info "Existing releases:"
            ls -lh "$RELEASE_DIR"/*.zip 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
        fi
    fi
    echo ""
}

# Help message
cmd_help() {
    echo "YayBoost Release Script"
    echo ""
    echo "Usage: ./scripts/release.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  package [version]  Create Pro release ZIP package"
    echo "                     Uses current version if not specified"
    echo "  package-free       Create Free release ZIP package"
    echo "                     Strips premium code and features"
    echo "  bump <version>     Bump version in all plugin files"
    echo "  info               Show current version and plugin info"
    echo "  help               Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./scripts/release.sh package           # Package Pro version"
    echo "  ./scripts/release.sh package 1.1.0     # Package Pro specific version"
    echo "  ./scripts/release.sh package-free      # Package Free version"
    echo "  ./scripts/release.sh bump 1.1.0        # Bump to version 1.1.0"
    echo "  ./scripts/release.sh info              # Show plugin info"
    echo ""
    echo "Release workflow:"
    echo "  1. ./scripts/release.sh bump 1.1.0     # Update version"
    echo "  2. ./scripts/release.sh package        # Create Pro ZIP"
    echo "  3. ./scripts/release.sh package-free   # Create Free ZIP"
    echo "  4. Upload dist/*.zip / release/*.zip"
    echo ""
}

# Main
main() {
    local cmd=${1:-help}
    shift 2>/dev/null || true

    case $cmd in
        package|pkg|zip)
            cmd_package "$@"
            ;;
        package-free|free)
            cmd_package_free "$@"
            ;;
        bump|version)
            cmd_bump "$@"
            ;;
        info|status)
            cmd_info
            ;;
        help|--help|-h)
            cmd_help
            ;;
        *)
            print_error "Unknown command: $cmd"
            cmd_help
            exit 1
            ;;
    esac
}

main "$@"
