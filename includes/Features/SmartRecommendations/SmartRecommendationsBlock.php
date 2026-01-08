<?php
/**
 * Smart Recommendations Gutenberg Block
 *
 * Registers the Smart Recommendations block.
 * - Editor: Data localized via enqueue_block_editor_assets
 * - Frontend: Data passed via wp_interactivity_state() in render.php
 *
 * @package YayBoost
 */

namespace YayBoost\Features\SmartRecommendations;

/**
 * Smart Recommendations Block class
 */
class SmartRecommendationsBlock {

    /**
     * Feature instance
     *
     * @var SmartRecommendationsFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param SmartRecommendationsFeature $feature Feature instance.
     */
    public function __construct( SmartRecommendationsFeature $feature ) {
        $this->feature = $feature;

        add_action( 'init', [ $this, 'register_block' ] );
    }

    /**
     * Get feature instance
     *
     * @return SmartRecommendationsFeature|null
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
        $block_json_path = YAYBOOST_PATH . 'assets/dist/blocks/smart-recommendations/block.json';

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
}