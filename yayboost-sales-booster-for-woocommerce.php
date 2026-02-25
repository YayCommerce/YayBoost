<?php
/**
 * Plugin Name: YayBoost - Sales Booster for WooCommerce
 * Plugin URI: https://yaycommerce.com/yayboost
 * Description: Boost your WooCommerce sales with intelligent features and recommendations
 * Version: 1.0.0
 * Author: YayCommerce
 * Author URI: https://yaycommerce.com
 * Text Domain: yayboost-sales-booster-for-woocommerce
 * Domain Path: /languages
 * Requires at least: 5.8
 * Requires Plugins: woocommerce
 * Requires PHP: 7.4
 * Tested up to: 6.9
 * WC requires at least: 8.0
 * WC tested up to: 10.4.3
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 */

defined( 'ABSPATH' ) || exit;

// Define plugin constants
define( 'YAYBOOST_VERSION', '1.0.0' );
define( 'YAYBOOST_FILE', __FILE__ );
define( 'YAYBOOST_PATH', plugin_dir_path( __FILE__ ) );
define( 'YAYBOOST_URL', plugin_dir_url( __FILE__ ) );
define( 'YAYBOOST_BASENAME', plugin_basename( __FILE__ ) );
define( 'YAYBOOST_IS_DEVELOPMENT', true );

// Composer autoloader
if (file_exists( YAYBOOST_PATH . 'vendor/autoload.php' )) {
    require_once YAYBOOST_PATH . 'vendor/autoload.php';
}

/**
 * Check if WooCommerce is active
 */
function yayboost_is_woocommerce_active() {
    return class_exists( 'WooCommerce' );
}

/**
 * Enable compatible HPOS for the plugin
 */
if ( ! function_exists( 'yayboost_enable_compatible_hpos' ) ) {
    function yayboost_enable_compatible_hpos() {
        if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
            \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
        }
    }
}

/**
 * Initialize the plugin
 */
function yayboost_init() {
    if ( ! yayboost_is_woocommerce_active()) {
        add_action( 'admin_notices', 'yayboost_woocommerce_missing_notice' );
        return;
    }

    add_action( 'before_woocommerce_init', 'yayboost_enable_compatible_hpos' );

    // Register FBT backfill cron hooks
    \YayBoost\Features\FrequentlyBoughtTogether\FBTBackfillCron::register();

    try {
        $bootstrap = new \YayBoost\Bootstrap();
        $bootstrap->init();
    } catch (Exception $e) {
        add_action(
            'admin_notices',
            function () use ($e) {
                printf(
                    '<div class="notice notice-error"><p>%s</p></div>',
                    /* translators: %s: Error message. */
                    esc_html( sprintf( __( 'YayBoost Error: %s', 'yayboost-sales-booster-for-woocommerce' ), $e->getMessage() ) )
                );
            }
        );
    }
}
add_action( 'plugins_loaded', 'yayboost_init', 20 );

/**
 * Display WooCommerce missing notice
 */
function yayboost_woocommerce_missing_notice() {
    ?>
    <div class="notice notice-error">
        <p>
            <?php
            echo wp_kses_post(
                __( '<strong>YayBoost</strong> requires <strong>WooCommerce</strong> to be installed and activated.', 'yayboost-sales-booster-for-woocommerce' )
            );
            ?>
        </p>
    </div>
    <?php
}

/**
 * Plugin activation hook
 */
function yayboost_activate() {
    if ( ! yayboost_is_woocommerce_active()) {
        wp_die(
            esc_html__( 'YayBoost requires WooCommerce to be installed and activated.', 'yayboost-sales-booster-for-woocommerce' ),
            esc_html__( 'Plugin Activation Error', 'yayboost-sales-booster-for-woocommerce' ),
            [ 'back_link' => true ]
        );
    }

    // Run database migrations
    \YayBoost\Database\Migrator::activate();

    // Set default options
    add_option( 'yayboost_version', YAYBOOST_VERSION );
    add_option(
        'yayboost_settings',
        [
            'features' => [],
        ]
    );

    // Schedule analytics cron jobs
    \YayBoost\Analytics\AnalyticsAggregator::schedule();

    // Schedule FBT backfill to run in background
    \YayBoost\Features\FrequentlyBoughtTogether\FBTBackfillCron::schedule();

    // Flush rewrite rules
    flush_rewrite_rules();
}
register_activation_hook( __FILE__, 'yayboost_activate' );

/**
 * Plugin deactivation hook
 */
function yayboost_deactivate() {
    // Unschedule analytics cron jobs
    \YayBoost\Analytics\AnalyticsAggregator::unschedule();

    // Unschedule FBT backfill cron
    \YayBoost\Features\FrequentlyBoughtTogether\FBTBackfillCron::unschedule();

    flush_rewrite_rules();
}
register_deactivation_hook( __FILE__, 'yayboost_deactivate' );

