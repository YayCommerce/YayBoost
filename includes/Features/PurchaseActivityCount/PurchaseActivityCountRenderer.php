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
     * @return string HTML content.
     */
    public function get_content(): string {
        $minimum_count_display = (int) ( $this->feature->get( 'minimum_count_display' ) ?? 1 );
        $count                 = $this->tracker->get_purchase_activity_count();
        $is_hidden             = $count < $minimum_count_display;
        $text                  = str_replace( '{count}', $count, $this->feature->get( 'display.text' ) );

        return $this->render_content( $this->feature->get( 'display.style' ), $text, $count, $this->feature->get( 'display.text' ), $this->feature->get( 'display.text_color' ), $this->feature->get( 'display.background_color' ), $is_hidden );
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
    private function render_content( string $text, int $count, string $display_text, bool $is_hidden ): string {
        $hidden_class = $is_hidden ? 'hidden' : '';
        $data_attrs   = 'data-text="' . esc_attr( $display_text ) . '" data-count="' . esc_attr( $count ) . '"';

        return sprintf(
            '<div class="yayboost-pac %s" %s>%s</div>',
            $hidden_class,
            $data_attrs,
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
            YAYBOOST_URL . 'assets/purchase-activity-count.css',
            [],
            YAYBOOST_VERSION
        );
    }
}
