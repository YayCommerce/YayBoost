# Release Process

This document describes the release process for YayBoost.

## Prerequisites

Before creating a release, ensure you have:

- [x] Composer installed
- [x] pnpm installed  
- [x] zip utility available
- [x] All tests passing
- [x] CHANGELOG.md updated
- [x] Version number updated in `yayboost.php`

## Release Script

The `release.sh` script automates the entire build and packaging process.

### What the Script Does

1. **Checks Prerequisites** - Verifies required tools are installed
2. **Cleans Previous Builds** - Removes old build artifacts
3. **Installs Production Dependencies** - Installs only production PHP packages
4. **Builds Frontend Assets** - Compiles React app with Vite
5. **Copies Plugin Files** - Creates clean copy respecting `.distignore`
6. **Verifies Build** - Checks all critical files are present
7. **Creates Zip File** - Packages plugin for distribution
8. **Generates Checksum** - Creates SHA-256 hash for verification
9. **Restores Dev Environment** - Reinstalls dev dependencies

### Usage

#### Quick Release

```bash
./release.sh
```

or using the run script:

```bash
./run.sh release
```

#### Manual Steps

If you need more control, you can run steps individually:

```bash
# 1. Install production dependencies
composer install --no-dev --optimize-autoloader

# 2. Build frontend
cd apps/admin-settings
pnpm install
pnpm build
cd ../..

# 3. Create release directory
mkdir -p release

# 4. Copy files (respecting .distignore)
# See release.sh for exact rsync command

# 5. Create zip
cd release
zip -r yayboost-sales-booster-for-woocommerce-1.0.0.zip yayboost-sales-booster-for-woocommerce/

# 6. Restore dev dependencies
composer install
```

## Version Bumping

Before running the release script:

### 1. Update Version in Main File

Edit `yayboost.php`:

```php
/**
 * Plugin Name: YayBoost
 * Version: 1.0.1  // <-- Update this
 */

define('YAYBOOST_VERSION', '1.0.1');  // <-- And this
```

### 2. Update CHANGELOG.md

Add release notes:

```markdown
## [1.0.1] - 2025-12-01

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description
```

### 3. Commit Version Changes

```bash
git add yayboost.php CHANGELOG.md
git commit -m "Bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags
```

## Release Output

After running the script, you'll find:

```
release/
├── yayboost-1.0.1.zip         # Distribution package
├── yayboost-1.0.1.sha256      # Checksum file
└── temp/                      # Temporary files (auto-cleaned)
```

## What's Included in the Release

The release package includes:

- ✅ PHP source files (`includes/`)
- ✅ Compiled frontend assets (`assets/dist/`)
- ✅ Production Composer dependencies (`vendor/`)
- ✅ Plugin main file (`yayboost.php`)
- ✅ Documentation (`README.md`, `CHANGELOG.md`, `LICENSE`)

## What's Excluded from the Release

Based on `.distignore`, these are excluded:

- ❌ Source frontend code (`apps/`)
- ❌ Development dependencies
- ❌ Configuration files (`.vscode/`, `phpcs.xml`, etc.)
- ❌ Build scripts (`release.sh`, `run.sh`)
- ❌ Git files (`.git/`, `.gitignore`)
- ❌ Node modules
- ❌ Development tools

## Testing the Release

### 1. Extract and Install

```bash
cd release
unzip yayboost-1.0.1.zip -d test-install
```

### 2. Verify Contents

Check that all required files are present:

```bash
cd test-install/yayboost
ls -la

# Should see:
# - yayboost.php
# - includes/
# - vendor/
# - assets/dist/
# - README.md
```

### 3. Install on Test Site

1. Upload to WordPress test site
2. Activate plugin
3. Verify all features work
4. Check browser console for errors
5. Test admin interface
6. Test REST API endpoints

### 4. Verify Checksum

```bash
shasum -a 256 yayboost-1.0.1.zip
# Compare with contents of yayboost-1.0.1.sha256
```

## Troubleshooting

### Build Fails: "pnpm not found"

Install pnpm globally:

```bash
npm install -g pnpm
```

### Build Fails: "Composer not found"

Install Composer from https://getcomposer.org/

### Assets Not Building

Ensure you're in the project root and the frontend builds:

```bash
cd apps/admin-settings
pnpm install
pnpm build
```

Check for errors in the build output.

### Zip File Is Too Large

Check what's being included:

```bash
cd release/temp/yayboost
du -sh *
```

Update `.distignore` to exclude unnecessary files.

### Missing Files in Release

Verify your `.distignore` isn't excluding required files.

Common issues:
- Don't exclude `vendor/` (needed for production)
- Don't exclude `assets/dist/` (compiled assets)

## WordPress.org Release

If publishing to WordPress.org:

### 1. Prepare SVN Checkout

```bash
svn co https://plugins.svn.wordpress.org/yayboost svn-yayboost
cd svn-yayboost
```

### 2. Update Trunk

```bash
# Extract release to trunk
cd trunk
unzip ../../release/yayboost-1.0.1.zip
mv yayboost/* .
rmdir yayboost
```

### 3. Create Tag

```bash
cd ..
svn cp trunk tags/1.0.1
```

### 4. Commit to SVN

```bash
svn stat  # Review changes
svn add --force .  # Add new files
svn ci -m "Release version 1.0.1"
```

## Security Checklist

Before releasing, verify:

- [ ] No hardcoded credentials
- [ ] No debug code left in
- [ ] All user input is sanitized
- [ ] All output is escaped
- [ ] Nonces are used for forms
- [ ] Permissions are checked
- [ ] SQL queries use prepared statements
- [ ] No sensitive data in logs

## Post-Release

After successful release:

1. ✅ Test on live site
2. ✅ Monitor error logs
3. ✅ Check support channels
4. ✅ Update documentation site
5. ✅ Announce release (social media, blog)
6. ✅ Monitor WordPress.org reviews

## Emergency Rollback

If critical issues are found:

1. Immediately remove download link
2. Post warning on WordPress.org
3. Release hotfix version (e.g., 1.0.2)
4. Document issue in CHANGELOG
5. Learn from the issue

## Resources

- [WordPress Plugin Handbook](https://developer.wordpress.org/plugins/)
- [WordPress SVN Guide](https://developer.wordpress.org/plugins/wordpress-org/how-to-use-subversion/)
- [Semantic Versioning](https://semver.org/)

