/**
 * Webpack configuration for YayBoost Blocks
 *
 * Uses @wordpress/scripts defaults with WooCommerce dependency extraction.
 * Required for Slot/Fill extensions that use WooCommerce packages.
 */

const path = require("path");
const fs = require("fs");
const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const WooCommerceDependencyExtractionWebpackPlugin = require("@woocommerce/dependency-extraction-webpack-plugin");

// @wordpress/scripts can export a single config or an array. Normalize to array.
const configs = Array.isArray(defaultConfig) ? defaultConfig : [defaultConfig];

// Discover block.json files under src and add their index.js as entries
function findBlockEntries() {
  const entries = {};
  const srcDir = path.resolve(__dirname, "src");

  function walk(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        walk(fullPath);
      } else if (item.isFile() && item.name === "block.json") {
        const blockDir = path.dirname(fullPath);
        const indexPath = path.join(blockDir, "index.js");
        if (fs.existsSync(indexPath)) {
          const entryKey = path
            .relative(srcDir, path.join(blockDir, "index"))
            .replace(/\\/g, "/");
          entries[entryKey] = indexPath;
        }
      }
    }
  }

  if (fs.existsSync(srcDir)) {
    walk(srcDir);
  }

  return entries;
}

module.exports = configs.map((config) => {
  const newConfig = { ...config };

  // Merge entry points, adding Slot/Fill entry
  newConfig.entry = {
    ...(config.entry || {}),
    ...findBlockEntries(),
  };

  // Swap dependency extraction plugin with WooCommerce variant
  const plugins = Array.isArray(config.plugins)
    ? config.plugins.filter(
        (plugin) =>
          plugin.constructor.name !== "DependencyExtractionWebpackPlugin"
      )
    : [];

  plugins.push(new WooCommerceDependencyExtractionWebpackPlugin());
  newConfig.plugins = plugins;

  // Keep other settings unchanged
  return newConfig;
});
