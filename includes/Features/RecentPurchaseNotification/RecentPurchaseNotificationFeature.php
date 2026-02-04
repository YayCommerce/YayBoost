<?php
/**
 * Recent Purchase Notification Feature
 *
 * Displays a recent purchase notification on product pages.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\RecentPurchaseNotification;

use YayBoost\Features\AbstractFeature;

/**
 * Recent Purchase Notification feature implementation
 */
class RecentPurchaseNotificationFeature extends AbstractFeature {

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'recent_purchase_notification';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Recent Purchase Notification';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display a notification when a customer makes a recent purchase';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'product_discovery';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'chat';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 30;

    /**
     * Tracker instance
     *
     * @var RecentPurchaseNotificationTracker
     */
    private $tracker;

    /**
     * Renderer instance
     *
     * @var RecentPurchaseNotificationRenderer
     */
    private $renderer;

    /**
     * AJAX handler instance
     *
     * @var RecentPurchaseNotificationAjaxHandler
     */
    private $ajax_handler;

    /**
     * Constructor
     *
     * @param \YayBoost\Container\Container $container DI container.
     */
    public function __construct( $container ) {
        parent::__construct( $container );

        // Initialize modules
        $this->tracker      = new RecentPurchaseNotificationTracker( $this );
        $this->renderer     = new RecentPurchaseNotificationRenderer( $this, $this->tracker );
        $this->ajax_handler = new RecentPurchaseNotificationAjaxHandler( $this->tracker );

        // Register AJAX hooks
        $this->ajax_handler->register_hooks();
    }

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        if ( ! $this->is_enabled() ) {
            return;
        }
        // Enqueue assets early (wp_footer prints scripts before running actions)
        add_action( 'wp_enqueue_scripts', [ $this, 'maybe_enqueue_assets' ] );
        // Render content in footer
        add_action( 'wp_footer', [ $this, 'maybe_render_content' ] );
    }

    /**
     * Check if we're on a WooCommerce page where notifications should show
     *
     * @return bool
     */
    private function is_woocommerce_page(): bool {
        if ( ! function_exists( 'is_shop' ) ) {
            return false;
        }
        return is_shop() || is_product() || is_product_category();
    }

    /**
     * Conditionally enqueue assets only on WooCommerce pages
     *
     * @return void
     */
    public function maybe_enqueue_assets(): void {
        if ( $this->is_woocommerce_page() ) {
            $this->renderer->enqueue_assets();
        }
    }

    /**
     * Conditionally render content only on WooCommerce pages
     *
     * @return void
     */
    public function maybe_render_content(): void {
        if ( $this->is_woocommerce_page() ) {
            $this->renderer->render();
        }
    }

    /**
     * Render recent purchase notification content
     *
     * @return void
     */
    public function render_content(): void {
        $this->renderer->render();
    }

    /**
     * Get rendered content (for block rendering)
     *
     * @return string HTML content.
     */
    public function get_content(): string {
        return $this->renderer->get_content();
    }

    /**
     * Enqueue frontend assets (for block rendering)
     *
     * @return void
     */
    public function enqueue_assets(): void {
        $this->renderer->enqueue_assets();
    }

    /**
     * Get default settings
     *
     * @return array Default settings.
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'       => true,
                'tracking_mode' => 'real-orders',
                'real_orders'   => [
                    'order_time_range'       => 'last-7-days',
                    'order_status'           => [ 'completed', 'processing' ],
                    'minimum_order_required' => 3,
                ],
                'timing'        => [
                    'delay'            => 10,
                    'interval_between' => 10,
                ],
                'display'       => [
                    'customer_name'   => 'full-name',
                    'product_details' => [ 'title', 'price' ],
                ],
            ]
        );
    }
}
