<?php
/**
 * Free Shipping Bar Gutenberg Block
 *
 * Registers the Free Shipping Bar block using WordPress Interactivity API.
 * - Editor: Data localized via enqueue_block_editor_assets
 * - Frontend: Data passed via wp_interactivity_state() in render.php
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FreeShippingBar;

/**
 * Free Shipping Bar Block class
 */
class FreeShippingBarBlock {

    /**
     * Feature instance
     *
     * @var FreeShippingBarFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param FreeShippingBarFeature $feature Feature instance.
     */
    public function __construct( $feature ) {
        $this->feature = $feature;

		add_action( 'init', [ $this, 'register_block' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_data' ] );
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

		// Register block with feature context for render.php
		// Frontend data localization handled via wp_interactivity_state() in render.php
		register_block_type(
			$block_json_path,
			[
				'provides_context' => [
					'feature' => $this->feature,
				],
			]
        );
    }

    /**
     * Enqueue data for block editor
     * Localizes feature config to editor script for live preview
     *
     * @return void
     */
    public function enqueue_editor_data() {
        wp_localize_script(
            'yayboost-free-shipping-bar-editor-script',
            'yayboostShippingBar',
            $this->feature->get_localization_data()
        );
    }
}
