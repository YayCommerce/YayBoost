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
        echo wp_kses_post( $this->get_content() );
    }

    /**
     * Get rendered HTML content
     *
     * @return string HTML content.
     */
    public function get_content(): string {
        return '<div class="yayboost-recent-purchase-notification"></div>';
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
        if ( wp_script_is( 'yayboost-recent-purchase', 'enqueued' ) ) {
            return;
        }

        wp_enqueue_script(
            'yayboost-recent-purchase',
            YAYBOOST_URL . 'assets/js/recent-purchase-notification.js',
            [ 'jquery' ],
            YAYBOOST_VERSION,
            true
        );

        $page_id = $this->tracker->get_current_page_id();
        if ( $page_id > 0 ) {
            wp_localize_script(
                'yayboost-recent-purchase',
                'yayboostRecentPurchase',
                [
                    'ajaxUrl'         => admin_url( 'admin-ajax.php' ),
                    'nonce'           => wp_create_nonce( RecentPurchaseNotificationAjaxHandler::NONCE_ACTION ),
                    'pageId'          => $page_id,
                    'text'            => [
                        'bought' => __( 'bought this product', 'yayboost' ),
                        'ago'    => __( 'ago', 'yayboost' ),
                    ],
                    'trackingMode'    => $this->feature->get( 'tracking_mode' ),
                    'initialDelay'    => $this->feature->get( 'timing.delay' ),
                    'intervalBetween' => $this->feature->get( 'timing.interval_between' ),
                    'customerName'    => $this->feature->get( 'display.customer_name' ),
                    'productDetails'  => $this->feature->get( 'display.product_details' ),
                ]
            );
        }//end if
    }
}
