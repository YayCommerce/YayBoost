<?php
/**
 * Free Shipping Bar Slot/Fill Extension
 *
 * Handles enqueuing scripts for Slot/Fill pattern in Cart/Checkout Blocks
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FreeShippingBar;

use YayBoost\Traits\Singleton;

/**
 * Free Shipping Bar Slot/Fill class
 */
class FreeShippingBarSlotFill {
    use Singleton;

    /**
     * Feature instance
     *
     * @var FreeShippingBarFeature
     */
    private $feature;

    /**
     * Constructor
     */
    protected function __construct() {
        // Enqueue scripts only on frontend when Cart/Checkout blocks are present
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_scripts' ], 100 );
    }

    /**
     * Set feature instance
     *
     * @param FreeShippingBarFeature $feature Feature instance.
     * @return void
     */
    public function set_feature( FreeShippingBarFeature $feature ) {
        $this->feature = $feature;
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
     * Enqueue scripts for Slot/Fill extension
     * Only loads when Cart Block or Checkout Block is present
     *
     * @return void
     */
    public function enqueue_scripts() {
        if ( ! $this->feature || ! $this->feature->is_enabled() ) {
            return;
        }

        if ( is_admin() ) {
            return;
        }

        // Only load on pages with Cart Block or Checkout Block
        if ( ! has_block( 'woocommerce/cart' ) && ! has_block( 'woocommerce/checkout' ) ) {
            return;
        }

        $asset_file = YAYBOOST_PATH . 'assets/dist/blocks/free-shipping-bar-slot/index.asset.php';

        if ( ! file_exists( $asset_file ) ) {
            return;
        }

        $asset = include $asset_file;

        // Enqueue script
        wp_enqueue_script(
            'yayboost-free-shipping-bar-slot',
            YAYBOOST_URL . 'assets/dist/blocks/free-shipping-bar-slot/index.js',
            $asset['dependencies'],
            $asset['version'],
            true
        );

        // Localize data for JavaScript
        wp_localize_script(
            'yayboost-free-shipping-bar-slot',
            'yayboostShippingBar',
            $this->feature->get_localization_data()
        );

        // Enqueue CSS (reuse existing styles)
        wp_enqueue_style(
            'yayboost-free-shipping-bar',
            YAYBOOST_URL . 'assets/css/free-shipping-bar.css',
            [],
            YAYBOOST_VERSION
        );
    }
}
