=== YayBoost - Sales Booster for WooCommerce ===
Contributors: yaycommerce
Tags: woocommerce, sales, conversion, upsell, cross-sell
Requires at least: 5.8
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Boost your WooCommerce sales with intelligent conversion optimization features like exit-intent popups, free shipping bars, frequently bought together, and more.

== Description ==

YayBoost is a powerful WooCommerce conversion optimization plugin that helps you increase sales and average order value with a suite of proven sales-boosting features.

**Features:**

= Exit-Intent Popup =
Show a popup when customers try to leave with items in their cart. Offer a discount to encourage them to complete the purchase.

= Free Shipping Bar =
Display a progress bar that motivates customers to add more products to reach the free shipping threshold.

= Frequently Bought Together =
Display products that are commonly purchased together to boost cross-sales and increase average order value.

= Live Visitor Count =
Show the number of visitors currently viewing a product page to create urgency and social proof.

= Next Order Coupon =
Automatically generate a discount coupon after each purchase to encourage repeat orders.

= Order Bump =
Display one-click upsell offers during checkout to increase order value.

= Purchase Activity Count =
Show the number of recent purchases for a product or category to build trust and urgency.

= Smart Recommendations =
Manage custom product recommendation rules to display relevant products to your customers.

= Stock Scarcity =
Display low-stock indicators on product pages to create urgency and drive faster purchasing decisions.

= Analytics Dashboard =
Track impressions, clicks, add-to-cart events, and conversions for each feature. All analytics data is stored locally in your WordPress database.

== Installation ==

1. Upload the `yayboost` folder to the `/wp-content/plugins/` directory, or install the plugin through the WordPress plugins screen.
2. Activate the plugin through the 'Plugins' screen in WordPress.
3. Make sure WooCommerce is installed and activated.
4. Navigate to **YayCommerce > YayBoost** to configure features.

== Frequently Asked Questions ==

= Does this plugin require WooCommerce? =
Yes. WooCommerce must be installed and activated for YayBoost to work.

= Is the plugin compatible with WooCommerce HPOS? =
Yes. YayBoost is fully compatible with WooCommerce High-Performance Order Storage (HPOS).

= Where is the analytics data stored? =
All analytics data (impressions, clicks, conversions) is stored locally in your WordPress database. No data is sent to external analytics services.

== Screenshots ==

1. YayBoost features dashboard
2. Feature configuration page
3. Exit-Intent Popup settings
4. Free Shipping Bar on the frontend
5. Frequently Bought Together display
6. Analytics overview

== Changelog ==

= 1.0.0 =
* Initial release
* Exit-Intent Popup feature
* Free Shipping Bar feature
* Frequently Bought Together feature
* Live Visitor Count feature
* Next Order Coupon feature
* Order Bump feature
* Purchase Activity Count feature
* Smart Recommendations feature
* Stock Scarcity feature
* Analytics dashboard

== External services ==

This plugin connects to external services in the following cases:

= WordPress.org Plugin Directory =

The plugin includes an "Other Plugins" admin page that allows administrators to browse, install, and activate a curated list of recommended plugins from the WordPress.org Plugin Directory.

* **What it does:** Displays recommended plugins and allows administrators to install and activate them directly from the admin dashboard.
* **When data is sent:** When an administrator visits the "Other Plugins" page or clicks to install, update, or activate a recommended plugin.
* **What data is sent:** Plugin slug and download URL are sent to the WordPress.org API to retrieve plugin information and download plugin packages. Only plugins from a predefined allowlist can be installed or activated through this feature.
* **Service provider:** WordPress.org
* **Terms of use:** [https://wordpress.org/about/domains/](https://wordpress.org/about/domains/)
* **Privacy policy:** [https://wordpress.org/about/privacy/](https://wordpress.org/about/privacy/)

Plugin icon images are loaded from the WordPress.org plugin assets CDN (ps.w.org) when the "Other Plugins" page is displayed in the admin area.
