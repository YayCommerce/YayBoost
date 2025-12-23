/**
 * Webpack configuration for YayBoost Blocks
 *
 * Uses @wordpress/scripts defaults with WooCommerce dependency extraction.
 * Required for Slot/Fill extensions that use WooCommerce packages.
 */

const path = require("path");
const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const WooCommerceDependencyExtractionWebpackPlugin = require("@woocommerce/dependency-extraction-webpack-plugin");

// @wordpress/scripts can export a single config or an array. Normalize to array.
const configs = Array.isArray(defaultConfig) ? defaultConfig : [defaultConfig];

module.exports = configs.map((config) => {
  const newConfig = { ...config };

  // Merge entry points, adding Slot/Fill entry
  newConfig.entry = {
    ...(config.entry || {}),
    "free-shipping-bar-slot/index": path.resolve(
      __dirname,
      "src/free-shipping-bar-slot/index.js"
    ),
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
