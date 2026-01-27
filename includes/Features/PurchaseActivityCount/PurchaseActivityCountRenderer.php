<?php
/**
 * Purchase Activity Count Renderer
 *
 * Handles content rendering and asset enqueuing for purchase activity count display.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PurchaseActivityCount;

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
     * @return void
     */
    public function render(): void {
        if ( ! $this->feature->should_apply_to_current_product() ) {
            return;
        }
        $this->enqueue_assets();
        echo wp_kses_post( $this->get_content() );
    }

    /**
     * Get rendered HTML content
     *
     * @param int|null $product_id Optional. Product ID when block is inside product-template. Null for current post/product.
     * @return string HTML content.
     */
    public function get_content( ?int $product_id = null ): string {
        $minimum_count_display = (int) ( $this->feature->get( 'minimum_count_display' ) ?? 1 );
        $count                 = $this->tracker->get_purchase_activity_count( $product_id );
        
        if ( $count < $minimum_count_display ) {
            return '';
        }
        
        $text                  = str_replace( '{count}', $count, $this->feature->get( 'display.text' ) );
        return $this->render_content( $text, $count, $this->feature->get( 'display.text' ));
    }

    /**
     * Render content based on style
     *
     * @param string $text             Rendered text with count.
     * @param int    $count            Visitor count.
     * @param string $display_text     Original display text template.
     * @param bool   $is_hidden        Whether element should be hidden.
     * @return string HTML content.
     */
    private function render_content( string $text, int $count, string $display_text ): string {
        return sprintf(
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
