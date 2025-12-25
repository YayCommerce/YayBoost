/**
 * Webpack configuration for YayBoost Slot/Fill Extensions
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

  // Replace WordPress dependency extraction with WooCommerce version
  const plugins = Array.isArray(config.plugins)
    ? config.plugins.filter(
        (plugin) =>
          plugin.constructor.name !== "DependencyExtractionWebpackPlugin"
      )
    : [];

  plugins.push(new WooCommerceDependencyExtractionWebpackPlugin());
  newConfig.plugins = plugins;

  // Add resolve alias to import from blocks src directory
  newConfig.resolve = {
    ...config.resolve,
    alias: {
      ...(config.resolve?.alias || {}),
      "@blocks": path.resolve(__dirname, "../src"),
    },
  };

  // Keep other settings unchanged
  return newConfig;
});

