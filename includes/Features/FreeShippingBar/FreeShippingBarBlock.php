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
     *
     * @return void
     */
    public function enqueue_feature_data() {
        if ( ! $this->feature || ! $this->feature->is_enabled() ) {
            return;
        }

        // Only enqueue on pages where cart might be present (not admin)
        if ( ! is_admin() ) {
            $this->feature->enqueue_assets();
        }
    }
}
