<?php
/**
 * Recent Purchase Notification Tracker
 *
 * Handles recent purchase notification database operations.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\RecentPurchaseNotification;

use YayBoost\Utils\Cache;

/**
 * Recent purchase notification tracking operations
 */
class RecentPurchaseNotificationTracker {

    /**
     * Cache TTL in seconds
     */
    const CACHE_TTL = 30;

    /**
     * Cache key prefix for purchases data
     */
    const CACHE_KEY_PREFIX = 'recent_purchase_data_';

    /**
     * Customer names
     */
    const CUSTOMER_NAMES = [
        'John Doe',
        'Jane Smith',
        'Bob Johnson',
        'Alice Brown',
        'Charlie Davis',
        'Diana White',
    ];

    /**
     * Feature instance for accessing settings
     *
     * @var RecentPurchaseNotificationFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param RecentPurchaseNotificationFeature $feature Feature instance.
     */
    public function __construct( RecentPurchaseNotificationFeature $feature ) {
        $this->feature = $feature;
    }

    /**
     * Get visitor count for current product page
     *
     * @return array Purchases data.
     */
    public function get_purchases_data(): array {
        if ( ! function_exists( 'is_product' ) || ! is_product() ) {
            return [];
        }

        $page_id = $this->get_current_page_id();
        if ( ! $page_id ) {
            return [];
        }

        $tracking_mode = $this->feature->get( 'tracking_mode' );

        if ( 'simulated' === $tracking_mode ) {
            return $this->get_simulated_data( $page_id );
        }

        return $this->get_real_data( $page_id );
    }

    /**
     * Get simulated purchases data (cached random)
     *
     * @param int $page_id Page ID.
     * @return array Simulated data.
     */
    private function get_simulated_data( int $page_id ): int {
        $purchases_data = [];
        // random purchases data
        $purchases_data = [
            'customer_name' => $this->get_random_customer_name(),
            'product'       => $this->get_random_product(),
            'time'          => $this->get_random_time(),
        ];

        return Cache::remember(
            self::CACHE_KEY_PREFIX . $page_id,
            self::CACHE_TTL,
            fn() => $purchases_data
        );
    }

    /**
     * Get real visitor count from database
     *
     * @param int $page_id Page ID.
     * @return array Real data.
     */
    private function get_real_data( int $page_id ): array {
        return Cache::remember(
            self::CACHE_KEY_PREFIX . $page_id,
            self::CACHE_TTL,
            fn() => $this->get_recent_purchases_data( $page_id )
        );
    }

    /**
     * Get recent purchases data for a specific page
     *
     * @param int $page_id Page ID.
     * @return array Recent purchases data.
     */
    public function get_recent_purchases_data( int $page_id ): array {
        // Get all orders with _yayboost_recent_purchase_notification_order meta
        if ( version_compare( WC_VERSION, '7.0', '<' ) ) {
            $orders = get_posts(
                [
                    'post_type'      => 'shop_order',
                    'posts_per_page' => -1,
                    'meta_key'       => '_yayboost_recent_purchase_notification_order',
                    'meta_value'     => true,
                ]
            );
        } else {
            // if wc version is greater than 7.0, use wc_get_orders instead of get_posts
            if ( version_compare( WC_VERSION, '7.0', '>=' ) ) {
                $orders = wc_get_orders(
                    [
                        'meta_query' => [
                            [
                                'key'     => '_yayboost_recent_purchase_notification_order',
                                'value'   => 'true',
                                'compare' => '=',
                            ],
                        ],
                        'limit'      => -1,
                    ]
                );
            }
        }//end if
        if ( empty( $orders ) ) {
            return [];
        }

        $purchases_data = [];
        foreach ( $orders as $order ) {
            if ( ! $order instanceof \WC_Order ) {
                continue;
            }
            $purchases_data[] = [
                'customer_name' => $order->get_customer_name(),
                'product'       => $order->get_items(),
                'time'          => $order->get_date_created(),
            ];
        }
        return $purchases_data;
    }

    /**
     * Get current page ID with fallbacks
     *
     * @return int Page ID or 0 if not found.
     */
    public function get_current_page_id(): int {
        $page_id = get_the_ID();
        if ( ! $page_id ) {
            global $product;
            if ( $product ) {
                $page_id = $product->get_id();
            }
        }
        if ( ! $page_id ) {
            $page_id = get_queried_object_id() ?? 0;
        }
        return (int) $page_id;
    }

    /**
     * Get cached purchases data (for AJAX handler)
     *
     * @param int $page_id Page ID.
     * @return array|false Purchases data or false if not cached.
     */
    public function get_cached_data( int $page_id ) {
        return Cache::get( self::CACHE_KEY_PREFIX . $page_id, false );
    }

    /**
     * Set cached purchases data (for AJAX handler)
     *
     * @param int   $page_id Page ID.
     * @param array $data Purchases data.
     * @return bool Success.
     */
    public function set_cached_data( int $page_id, array $data ): bool {
        return Cache::set( self::CACHE_KEY_PREFIX . $page_id, $data, self::CACHE_TTL );
    }

    /**
     * Get random customer name
     *
     * @return string Random customer name.
     */
    private function get_random_customer_name(): string {
        return self::CUSTOMER_NAMES[ array_rand( self::CUSTOMER_NAMES ) ];
    }

    /**
     * Get random product
     *
     * @return array Random product.
     */
    private function get_random_product(): array {
        // Get all products
        $products   = get_posts(
            [
                'post_type'      => 'product',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
            ]
        );
        $product_id = $products[ array_rand( $products ) ]->ID ?? 0;

        return [ wc_get_product( $product_id ) ];
    }

    /**
     * Get random time
     *
     * @return string Random time.
     */
    private function get_random_time(): string {
        return gmdate( 'Y-m-d H:i:s', time() - wp_rand( 60, 900 ) );
    }
}
