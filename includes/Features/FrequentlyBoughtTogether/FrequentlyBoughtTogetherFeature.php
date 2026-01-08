<?php
/**
 * Frequently Bought Together Feature
 *
 * Displays products that are frequently bought together with the current product
 * to increase average order value and cross-sell opportunities.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Features\AbstractFeature;

/**
 * Frequently Bought Together feature implementation
 */
class FrequentlyBoughtTogetherFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'frequently_bought_together';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Frequently Bought Together';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display products that are frequently bought together to boost cross-sales and increase average order value';

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
    protected $icon = 'shopping-cart';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 10;

    /**
     * FBT Repository instance
     *
     * @var FBTRepository
     */
    protected $repository;

    /**
     * FBT Collector instance
     *
     * @var FBTCollector
     */
    protected $collector;

    /**
     * FBT Cache Manager instance
     *
     * @var FBTCacheManager
     */
    protected $cache_manager;

    /**
     * FBT Renderer instance
     *
     * @var FBTRenderer
     */
    protected $renderer;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        if ( ! $this->is_enabled() ) {
            return;
        }

        // Initialize dependencies with dependency injection
        $this->cache_manager = new FBTCacheManager();
        $this->repository    = new FBTRepository( $this->cache_manager );
        $this->collector     = new FBTCollector( $this->cache_manager );
        $this->renderer      = new FBTRenderer( $this->repository );

        // Register data collection hooks (hybrid approach)
        add_action( 'woocommerce_thankyou', [ $this, 'handle_order_thankyou_with_cache' ], 10 );
        add_action( 'woocommerce_order_status_completed', [ $this, 'handle_order_completed_with_cache' ], 20 );
        add_action( 'yayboost_process_fbt_order', [ $this->collector, 'handle_background_job' ] );

        // Register display hooks - only check enabled
        if ( $this->is_enabled() ) {
            add_action( 'woocommerce_after_single_product_summary', [ $this, 'render_fbt_section' ], 25 );
        }

        // Enqueue frontend assets
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );

        // Register hook to add FBT checkbox via WooCommerce hook
        add_action( 'woocommerce_after_shop_loop_item', [ $this->renderer, 'render_fbt_checkbox' ], 15 );

        // Register AJAX handler for batch add-to-cart
        add_action( 'wp_ajax_yayboost_fbt_batch_add', [ $this, 'ajax_add_fbt_batch' ] );
        add_action( 'wp_ajax_nopriv_yayboost_fbt_batch_add', [ $this, 'ajax_add_fbt_batch' ] );

        // Register cleanup cron job
        if ( ! wp_next_scheduled( 'yayboost_fbt_weekly_cleanup' ) ) {
            wp_schedule_event( time(), 'weekly', 'yayboost_fbt_weekly_cleanup' );
        }
        add_action( 'yayboost_fbt_weekly_cleanup', [ $this, 'run_cleanup' ] );
    }

    /**
     * Get default settings
     *
     * @return array
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'             => false,
                'max_products'        => 4,
                'min_order_threshold' => 5,
                'layout'              => 'grid',
                'section_title'       => __( 'Frequently Bought Together', 'yayboost' ),
                'hide_if_in_cart'     => 'hide',
            ]
        );
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        // Only enqueue on product pages
        if ( ! is_product() ) {
            return;
        }

        // Enqueue script
        wp_enqueue_script(
            'yayboost-fbt',
            YAYBOOST_URL . 'assets/js/frequently-bought-together.js',
            [ 'jquery', 'wc-add-to-cart', 'wc-accounting' ],
            YAYBOOST_VERSION,
            true
        );

        // Enqueue style
        wp_enqueue_style(
            'yayboost-fbt',
            YAYBOOST_URL . 'assets/css/frequently-bought-together.css',
            [],
            YAYBOOST_VERSION
        );

        // Get WooCommerce currency settings
        $currency_symbol = get_woocommerce_currency_symbol();
        $currency_pos    = get_option( 'woocommerce_currency_pos', 'left' );
        $decimal_sep     = wc_get_price_decimal_separator();
        $thousand_sep    = wc_get_price_thousand_separator();
        $num_decimals    = wc_get_price_decimals();

        // Convert currency position to accounting.js format
        // Default left
        $format = '%s%v';
        if ( 'right' === $currency_pos ) {
            $format = '%v%s';
        } elseif ( 'left_space' === $currency_pos ) {
            $format = '%s %v';
        } elseif ( 'right_space' === $currency_pos ) {
            $format = '%v %s';
        }

        // Localize script
        wp_localize_script(
            'yayboost-fbt',
            'yayboostFBT',
            [
                'ajax_url' => admin_url( 'admin-ajax.php' ),
                'nonce'    => wp_create_nonce( 'yayboost_fbt_batch' ),
                'currency' => [
                    'symbol'    => $currency_symbol,
                    'format'    => $format,
                    'decimal'   => $decimal_sep,
                    'thousand'  => $thousand_sep,
                    'precision' => $num_decimals,
                ],
                'i18n'     => [
                    'adding'          => __( 'Adding to cart...', 'yayboost' ),
                    'added'           => __( 'Added to cart', 'yayboost' ),
                    'error'           => __( 'Error adding to cart', 'yayboost' ),
                    'select_products' => __( 'Please select at least one product', 'yayboost' ),
                ],
            ]
        );
    }

    /**
     * Render FBT section on product page
     *
     * @return void
     */
    public function render_fbt_section(): void {
        global $product;

        if ( ! $product ) {
            return;
        }

        $this->renderer->render( $product->get_id(), $this->get_settings() );
    }

    /**
     * AJAX handler for batch add to cart
     *
     * @return void
     */
    public function ajax_add_fbt_batch(): void {
        check_ajax_referer( 'yayboost_fbt_batch', 'nonce' );

        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            wp_send_json_error( [ 'message' => __( 'WooCommerce is not available', 'yayboost' ) ] );
            return;
        }

        $product_ids        = isset( $_POST['product_ids'] ) ? array_map( 'intval', (array) $_POST['product_ids'] ) : [];
        $current_product_id = isset( $_POST['current_product_id'] ) ? (int) $_POST['current_product_id'] : 0;

        if ( empty( $product_ids ) ) {
            wp_send_json_error( [ 'message' => __( 'No products selected', 'yayboost' ) ] );
            return;
        }

        // Ensure current product is included
        if ( $current_product_id && ! in_array( $current_product_id, $product_ids, true ) ) {
            array_unshift( $product_ids, $current_product_id );
        }

        $added_products = [];
        $errors         = [];

        foreach ( $product_ids as $product_id ) {
            $product = wc_get_product( $product_id );

            if ( ! $product ) {
                /* translators: %d: Product ID */
                $errors[] = sprintf( __( 'Product #%d not found', 'yayboost' ), $product_id );
                continue;
            }

            if ( ! $product->is_purchasable() ) {
                /* translators: %s: Product name */
                $errors[] = sprintf( __( 'Product "%s" is not purchasable', 'yayboost' ), $product->get_name() );
                continue;
            }

            if ( ! $product->is_in_stock() ) {
                /* translators: %s: Product name */
                $errors[] = sprintf( __( 'Product "%s" is out of stock', 'yayboost' ), $product->get_name() );
                continue;
            }

            // Add to cart
            $cart_item_key = WC()->cart->add_to_cart( $product_id, 1 );

            if ( $cart_item_key ) {
                $added_products[] = [
                    'id'   => $product_id,
                    'name' => $product->get_name(),
                ];
            } else {
                /* translators: %s: Product name */
                $errors[] = sprintf( __( 'Failed to add "%s" to cart', 'yayboost' ), $product->get_name() );
            }
        }//end foreach

        // Get cart fragments
        $fragments = apply_filters( 'woocommerce_add_to_cart_fragments', [] );

        if ( ! empty( $added_products ) ) {
            wp_send_json_success(
                [
                    /* translators: %d: Number of products */
                    'message'        => sprintf( __( 'Added %d product(s) to cart.', 'yayboost' ), count( $added_products ) ),
                    'added_products' => $added_products,
                    'errors'         => $errors,
                    'fragments'      => $fragments,
                    'cart_hash'      => WC()->cart->get_cart_hash(),
                ]
            );
        } else {
            wp_send_json_error(
                [
                    'message' => __( 'Failed to add products to cart', 'yayboost' ),
                    'errors'  => $errors,
                ]
            );
        }
    }

    /**
     * Run cleanup cron job
     *
     * @return void
     */
    public function run_cleanup(): void {
        $cleanup  = new FBTCleanup( $this->repository );
        $settings = $this->get_settings();
        $stats    = $cleanup->run_cleanup( $settings );

        // Log cleanup stats (only in debug mode)
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( sprintf( 'YayBoost FBT Cleanup: %d low count deleted, %d orphaned deleted, %d old deleted', $stats['low_count_deleted'], $stats['orphaned_deleted'], $stats['old_deleted'] ) );
        }
    }

    /**
     * Handle order thank you page with cache invalidation
     *
     * Wrapper around collector's handle_order_thankyou that also invalidates
     * total orders count cache when order is processed.
     *
     * @param int $order_id Order ID.
     * @return void
     */
    public function handle_order_thankyou_with_cache( int $order_id ): void {
        // Check if order will be processed (not already processed)
        if ( ! $this->collector->is_order_processed( $order_id ) ) {
            // Process order (this will invalidate product caches via cache manager)
            $this->collector->handle_order_thankyou( $order_id );

            // Invalidate total orders count cache using cache manager
            $this->cache_manager->invalidate_total_orders();
        }
    }

    /**
     * Handle order completed hook with cache invalidation
     *
     * Wrapper around collector's handle_order_completed that also invalidates
     * total orders count cache when order is processed.
     *
     * @param int $order_id Order ID.
     * @return void
     */
    public function handle_order_completed_with_cache( int $order_id ): void {
        // Check if order will be processed (not already processed)
        if ( ! $this->collector->is_order_processed( $order_id ) ) {
            // Process order (this will invalidate product caches via cache manager)
            $this->collector->handle_order_completed( $order_id );

            // Invalidate total orders count cache using cache manager
            // Note: This runs before background job, so we invalidate immediately
            // The background job will process the order and invalidate product caches
            $this->cache_manager->invalidate_total_orders();
        }
    }
}
