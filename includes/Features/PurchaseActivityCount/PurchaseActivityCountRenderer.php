<?php
/**
 * Purchase Activity Count Renderer
 *
 * Handles content rendering and asset enqueuing for purchase activity count display.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PurchaseActivityCount;

use YayBoost\Utils\Helpers;

/**
 * Content rendering for purchase activity count
 */
class PurchaseActivityCountRenderer {

    /**
     * Feature instance
     *
     * @var PurchaseActivityCountFeature
     */
    private $feature;

    /**
     * Tracker instance
     *
     * @var PurchaseActivityCountTracker
     */
    private $tracker;

    /**
     * Constructor
     *
     * @param PurchaseActivityCountFeature $feature Feature instance.
     * @param PurchaseActivityCountTracker $tracker Tracker instance.
     */
    public function __construct( PurchaseActivityCountFeature $feature, PurchaseActivityCountTracker $tracker ) {
        $this->feature = $feature;
        $this->tracker = $tracker;
    }

    /**
     * Render visitor count content
     *
     * @param int $product_id Optional. Product ID when block is inside product-template. Null for current post/product.
     *
     * @return void
     */
    public function render( $product_id = null ): void {

        if ( ! $this->feature->should_apply_to_product( $product_id ) ) {
            return;
        }
        $this->enqueue_assets();
        $minimum_count_display = (int) ( $this->feature->get( 'minimum_count_display' ) ?? 1 );
        $count                 = $this->tracker->get_purchase_activity_count( $product_id );
        if ( $count < $minimum_count_display ) {
            return;
        }

        $text = str_replace( '{count}', Helpers::format_pretty_number( $count ), $this->feature->get( 'display.text' ) );
        printf(
            '<div class="yayboost-pac">%s</div>',
            wp_kses_post( $text )
        );
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        if ( wp_style_is( 'yayboost-purchase-activity-count', 'enqueued' ) ) {
            return;
        }

        wp_enqueue_style(
            'yayboost-purchase-activity-count',
            YAYBOOST_URL . 'assets/dist/blocks/purchase-activity-count/style-index.css',
            [],
            YAYBOOST_VERSION
        );
    }
}
