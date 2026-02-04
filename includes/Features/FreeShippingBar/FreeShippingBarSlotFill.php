<?php
/**
 * Free Shipping Bar Slot/Fill Extension
 *
 * Handles enqueuing scripts for Slot/Fill pattern in Cart/Checkout Blocks
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FreeShippingBar;

defined( 'ABSPATH' ) || exit;
/**
 * Free Shipping Bar Slot/Fill class
 */
class FreeShippingBarSlotFill {

    /**
     * Feature instance
     *
     * @var FreeShippingBarFeature
     */
    private $feature;

    private $supported_blocks = [
        'woocommerce/cart',
        'woocommerce/checkout',
    ];

    /**
     * Constructor
     *
     * @param FreeShippingBarFeature $feature Feature instance.
     */
    public function __construct( FreeShippingBarFeature $feature ) {
        $this->feature = $feature;

        // Register and enqueue only when supported blocks are rendered
        foreach ( $this->supported_blocks as $block ) {
            add_action( 'render_block_' . $block, [ $this, 'maybe_enqueue_on_block_render' ], 10, 2 );
        }
    }

    /**
     * Get feature instance
     *
     * @return FreeShippingBarFeature|null
     */
    public function get_feature() {
        return $this->feature;
    }

    /**
     * Register and enqueue scripts when Cart/Checkout block is rendered
     * Only registers/enqueues if show_on settings match the current block type
     *
     * @param string $block_content The block content about to be rendered.
     * @param array  $block         The full block, including name and attributes.
     * @return string The block content (unchanged).
     */
    public function maybe_enqueue_on_block_render( $block_content, $block ) {
        if ( ! $this->should_process_block( $block ) ) {
            return $block_content;
        }

        $this->enqueue_assets();

        return $block_content;
    }

    /**
     * Check if block should be processed
     *
     * @param array $block The block data.
     * @return bool
     */
    private function should_process_block( $block ) {

        // Check feature enabled
        if ( ! $this->feature || ! $this->feature->is_enabled() || is_admin() ) {
            return false;
        }

        // Get display_positions from settings (matches frontend structure)
        // Structure: ['cart' => ['before_cart_table', 'after_cart_table'], 'checkout' => ['before_checkout_form', 'after_checkout_form']]
        $display_positions = $this->feature->get_settings()['display_positions'] ?? [];

        // Allowed positions for cart blocks (slot/fill compatible)
        $cart_positions = [ 'before_cart_table', 'after_cart_table' ];

        // Allowed positions for checkout blocks (slot/fill compatible)
        $checkout_positions = [ 'before_checkout_form', 'after_checkout_form' ];

        // Check if cart block should show shipping bar
        $is_cart_block = $block['blockName'] === 'woocommerce/cart';
        if ( $is_cart_block ) {
            $cart_selected = $display_positions['cart'] ?? [];
            // If any cart position is selected, enable slot/fill for cart block
            if ( ! empty( array_intersect( $cart_selected, $cart_positions ) ) ) {
                return true;
            }
        }

        // Check if checkout block should show shipping bar
        $is_checkout_block = $block['blockName'] === 'woocommerce/checkout';
        if ( $is_checkout_block ) {
            $checkout_selected = $display_positions['checkout'] ?? [];
            // If any checkout position is selected, enable slot/fill for checkout block
            if ( ! empty( array_intersect( $checkout_selected, $checkout_positions ) ) ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Register and enqueue scripts and styles (only once)
     *
     * @return void
     */
    private function enqueue_assets() {
        // Check if already enqueued to avoid duplicate
        if ( wp_script_is( 'yayboost-free-shipping-bar-slot', 'enqueued' ) ) {
            return;
        }

        $asset_file = YAYBOOST_PATH . 'assets/dist/blocks/free-shipping-bar-slot/index.asset.php';
        if ( ! file_exists( $asset_file ) ) {
            return;
        }

        $asset       = include $asset_file;
        $script_deps = array_merge( $asset['dependencies'], [ 'wc-accounting', 'wc-settings' ] );

        // wp_enqueue_script() will auto-register if not already registered
        wp_enqueue_script(
            'yayboost-free-shipping-bar-slot',
            YAYBOOST_URL . 'assets/dist/blocks/free-shipping-bar-slot/index.js',
            $script_deps,
            $asset['version'],
            true
        );

        // Localize data for JavaScript
        wp_localize_script(
            'yayboost-free-shipping-bar-slot',
            'yayboostShippingBar',
            $this->feature->get_localization_data()
        );

        // wp_enqueue_style() will auto-register if not already registered
        $this->feature->enqueue_styles();
    }
}
