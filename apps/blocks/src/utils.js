/**
 * Shared utility functions for blocks
 *
 * @package YayBoost
 */

/**
 * Format price using accounting.js with WooCommerce currency settings
 *
 * @param {number} amount The amount to format
 * @return {string} Formatted price string
 */
export function formatPrice(amount) {
  // Use accounting.formatMoney if available
  if (
    window.accounting &&
    typeof window.accounting.formatMoney === "function"
  ) {
    // Get currency settings from wcSettings if available
    let currencyOptions = {};

    if (window.wcSettings && window.wcSettings.currency) {
      const currency = window.wcSettings.currency;
      // Get currency symbol from WooCommerce
      currencyOptions.symbol = currency.symbol || "$";
      currencyOptions.precision = currency.precision;
      currencyOptions.decimal = currency.decimalSeparator || ".";
      currencyOptions.thousand = currency.thousandSeparator || ",";
      // Format: %s = symbol, %v = value
      // Position: left = '%s%v', right = '%v%s', left_space = '%s %v', right_space = '%v %s'
      const position = currency.symbolPosition || "left";
      if (position === "right") {
        currencyOptions.format = "%v%s";
      } else if (position === "left_space") {
        currencyOptions.format = "%s %v";
      } else if (position === "right_space") {
        currencyOptions.format = "%v %s";
      } else {
        currencyOptions.format = "%s%v"; // default left
      }
    }
    // Format with options (if any) or use default settings
    return window.accounting.formatMoney(amount, currencyOptions);
  }

  // Fallback if accounting is not available
  return String(amount);
}
