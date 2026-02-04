<?php
/**
 * Live Visitor Count Gutenberg Block
 *
 * Registers the Live Visitor Count block using WordPress Interactivity API.
 * - Editor: Data localized via enqueue_block_editor_assets
 * - Frontend: Data passed via wp_interactivity_state() in render.php
 *
 * @package YayBoost
 */

namespace YayBoost\Features\LiveVisitorCount;

defined( 'ABSPATH' ) || exit;
/**
 * Live Visitor Count Block class
 */
class LiveVisitorCountBlock {

    /**
     * Feature instance
     *
     * @var LiveVisitorCountFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param LiveVisitorCountFeature $feature Feature instance.
     */
    public function __construct( LiveVisitorCountFeature $feature ) {
        $this->feature = $feature;

        add_action( 'init', [ $this, 'register_block' ] );
        add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_data' ] );
        add_filter( 'allowed_block_types_all', [ $this, 'restrict_block_to_product_pages' ], 10, 2 );
    }

    /**
     * Get feature instance
     *
     * @return LiveVisitorCountFeature|null
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
        $block_json_path = YAYBOOST_PATH . 'assets/dist/blocks/live-visitor-count/block.json';

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
            'yayboost-live-visitor-count-editor-script',
            'yayboostLiveVisitorCount',
            $this->feature->get_settings()
        );
    }

    /**
     * Restrict block availability to product post type only
     *
     * @param bool|array              $allowed_block_types Array of allowed block type slugs, or true if all blocks are allowed.
     * @param WP_Block_Editor_Context $context The current block editor context.
     * @return bool|array Modified allowed block types.
     */
    public function restrict_block_to_product_pages( $allowed_block_types, $context ) {
        // If we're not in an editor context, return as-is
        if ( ! isset( $context->post ) ) {
            return $allowed_block_types;
        }

        $post_type = get_post_type( $context->post );

        // If we're on a product page, allow the block
        if ( 'product' === $post_type ) {
            return $allowed_block_types;
        }

        // Not on product page - remove this block
        $block_name = 'yayboost/live-visitor-count';

        // If all blocks allowed (true), get all registered blocks and exclude ours
        if ( true === $allowed_block_types ) {
            $all_blocks          = \WP_Block_Type_Registry::get_instance()->get_all_registered();
            $allowed_block_types = array_keys( $all_blocks );
        }

        if ( is_array( $allowed_block_types ) ) {
            $allowed_block_types = array_diff( $allowed_block_types, [ $block_name ] );
        }

        return $allowed_block_types;
    }
}
