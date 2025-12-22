<?php
/**
 * Free Shipping Bar Gutenberg Block
 *
 * Registers and renders the Free Shipping Bar block using WordPress Interactivity API
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FreeShippingBar;

use YayBoost\Traits\Singleton;

/**
 * Free Shipping Bar Block class
 */
class FreeShippingBarBlock {
    use Singleton;

    /**
     * Feature instance
     *
     * @var FreeShippingBarFeature
     */
    private $feature;

    /**
     * Flag to track if block has been rendered
     *
     * @var bool
     */
    private $rendered = false;

    /**
     * Constructor
     */
    protected function __construct() {
        add_action( 'init', [ $this, 'register_block' ] );

        // Enqueue feature assets for localized data (needed for Interactivity API)
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_feature_data' ], 100 );

        // Enqueue editor assets with localized data for preview
        add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_data' ] );
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
     * Register the block type
     *
     * @return void
     */
    public function register_block() {
        $block_json_path = YAYBOOST_PATH . 'assets/dist/blocks/free-shipping-bar/block.json';

        if ( ! file_exists( $block_json_path ) ) {
            return;
        }

        // Don't set render_callback - let WordPress auto-load render.php from block.json
        // This matches the pattern used by Interactive Demo Block
        register_block_type( $block_json_path );
    }

    /**
     * Enqueue feature data for Interactivity API
     * Only enqueue when block is actually present in content
     *
     * @return void
     */
    public function enqueue_feature_data() {
        if ( ! $this->feature || ! $this->feature->is_enabled() ) {
            return;
        }

        if ( is_admin() ) {
            return;
        }

        // Enqueue WooCommerce store data for cart data access in block's view script
        // This allows access to window.wp.data.select('wc/store/cart').getCartData()
        wp_enqueue_script( 'wc-blocks-checkout' );

        wp_enqueue_style(
            'yayboost-free-shipping-bar',
            YAYBOOST_URL . 'assets/css/free-shipping-bar.css',
            [],
            YAYBOOST_VERSION
        );

        wp_localize_script(
            'yayboost-free-shipping-bar',
            'yayboostShippingBar',
            $this->feature->get_localization_data()
        );
    }

    /**
     * Enqueue editor assets with localized data for preview
     *
     * @return void
     */
    public function enqueue_editor_data() {
        if ( ! $this->feature || ! $this->feature->is_enabled() ) {
            return;
        }

        // Localize data for editor preview
        wp_localize_script(
            'yayboost-free-shipping-bar-editor-script',
            'yayboostShippingBar',
            $this->feature->get_localization_data()
        );
    }
}
