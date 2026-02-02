<?php
/**
 * Purchase Notification Renderer
 *
 * Handles content rendering and asset enqueuing for purchase notification display.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\RecentPurchaseNotification;

/**
 * Content rendering for purchase notification
 */
class RecentPurchaseNotificationRenderer {

    /**
     * Feature instance
     *
     * @var RecentPurchaseNotificationFeature
     */
    private $feature;

    /**
     * Tracker instance
     *
     * @var RecentPurchaseNotificationTracker
     */
    private $tracker;

    /**
     * Constructor
     *
     * @param RecentPurchaseNotificationFeature $feature Feature instance.
     * @param RecentPurchaseNotificationTracker $tracker Tracker instance.
     */
    public function __construct( RecentPurchaseNotificationFeature $feature, RecentPurchaseNotificationTracker $tracker ) {
        $this->feature = $feature;
        $this->tracker = $tracker;
    }

    /**
     * Render purchase notification content
     *
     * @return void
     */
    public function render(): void {
        $this->enqueue_assets();
        echo wp_kses_post( $this->get_content() );
    }

    /**
     * Get rendered HTML content
     *
     * @return string HTML content.
     */
    public function get_content(): string {
        $tracking_mode          = $this->feature->get( 'tracking_mode' );
        $minimum_order_required = (int) ( $this->feature->get( 'real_orders.minimum_order_required' ) ?? 1 );
        $display_text           = '{customer_name} bought this product';
        $ago                    = __( 'ago', 'yayboost' );
        $purchases_data         = $this->tracker->get_purchases_data();

        if ( empty( $purchases_data ) ) {
            return '';
        }

        $content = '';
        foreach ( $purchases_data as $purchase ) {
            $content .= $this->render_container( $display_text, $ago, $purchase );
        }
        return $content;
    }

    /**
     * Render container
     *
     * @param string $display_text Display text.
     * @param string $ago Ago text.
     * @param array  $purchase Purchase data.
     * @return string Container HTML.
     */
    private function render_container( string $display_text, string $ago, array $purchase ): string {
        return sprintf(
            '<div class="yayboost-recent-purchase-notification">
				<button class="yayboost-recent-purchase__close" aria-label="Close">&times;</button>
				<div class="yayboost-recent-purchase__text">%s</div>
                <a class="yayboost-recent-purchase__link">
                    <div class="yayboost-recent-purchase__product">
                        <img src="%s" alt="" class="yayboost-recent-purchase__image" loading="lazy">
                        <div class="yayboost-recent-purchase__product-info">
                            <span class="yayboost-recent-purchase__product-name">%s</span>
							<span class="yayboost-recent-purchase__product-price">%s</span>
                            <span class="yayboost-recent-purchase__time">%s %s</span>
                        </div>
                    </div>
                </a>
			</div>',
            $display_text,
            $purchase['customer_name'],
            $purchase['product']['image'],
            $purchase['product']['name'],
            $purchase['product']['price'],
            $purchase['time'],
            $ago
        );
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        $this->enqueue_styles();
        $this->enqueue_scripts();
    }

    /**
     * Enqueue CSS styles
     *
     * @return void
     */
    private function enqueue_styles(): void {
        if ( wp_style_is( 'yayboost-recent-purchase-notification', 'enqueued' ) ) {
            return;
        }

        wp_enqueue_style(
            'yayboost-recent-purchase-notification',
            YAYBOOST_URL . 'assets/css/recent-purchase-notification.css',
            [],
            YAYBOOST_VERSION
        );
    }

    /**
     * Enqueue JavaScript and localize data
     *
     * @return void
     */
    private function enqueue_scripts(): void {
        if ( wp_script_is( 'yayboost-recent-purchase-notification', 'enqueued' ) ) {
            return;
        }

        wp_enqueue_script(
            'yayboost-recent-purchase-notification',
            YAYBOOST_URL . 'assets/js/recent-purchase-notification.js',
            [ 'jquery' ],
            YAYBOOST_VERSION,
            true
        );

        $page_id = $this->tracker->get_current_page_id();
        if ( $page_id > 0 ) {
            wp_localize_script(
                'yayboost-recent-purchase-notification',
                'yayboostRecentPurchaseNotification',
                [
                    'ajaxUrl'              => admin_url( 'admin-ajax.php' ),
                    'nonce'                => wp_create_nonce( RecentPurchaseNotificationAjaxHandler::NONCE_ACTION ),
                    'pageId'               => $page_id,
                    'initialDelay'         => $this->feature->get( 'timing.initial_delay' ),
                    'intervalBetween'      => $this->feature->get( 'timing.interval_between' ),
                    'minimumOrderRequired' => $this->feature->get( 'real_orders.minimum_order_required' ),
                    'customerName'         => $this->feature->get( 'display.customer_name' ),
                    'productDetails'       => $this->feature->get( 'display.product_details' ),
                ]
            );
        }
    }
}
