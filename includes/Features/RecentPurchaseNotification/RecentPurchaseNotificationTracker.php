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
     * Cache key prefix for purchases list
     */
    const CACHE_KEY_PREFIX = 'recent_purchase_list_';

    /**
     * Max orders to fetch when applying minimum_order_required filter (need enough to count per product)
     */
    const QUERY_LIMIT_FOR_MIN_ORDERS = 300;


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
     * Get normalized purchase list for AJAX
     *
     * @param int      $page_id  Page ID.
     * @param int      $limit    Max purchases to return.
     * @param int|null $after_id For delta fetch: only orders with ID > after_id.
     * @return array{ purchases: array, last_order_id: int|null }
     */
    public function get_purchase_list( int $page_id, int $limit = 20, ?int $after_id = null ): array {
        $tracking_mode = $this->feature->get( 'tracking_mode' );

        if ( 'simulated' === $tracking_mode ) {
            return $this->get_simulated_purchase_list( $page_id );
        }

        return $this->get_real_purchase_list( $page_id, $limit, $after_id );
    }

    /**
     * Get simulated purchase list (cached)
     *
     * @param int $page_id Page ID.
     * @return array{ purchases: array, last_order_id: null }
     */
    private function get_simulated_purchase_list( int $page_id ): array {
        $cache_key = self::CACHE_KEY_PREFIX . 'sim_' . $page_id;

        $purchases = Cache::remember(
            $cache_key,
            self::CACHE_TTL,
            function () {
                $list = [];
                for ( $i = 0; $i < 3; $i++ ) {
                    $product = $this->get_random_product_for_display();
                    if ( $product ) {
                        $list[] = [
                            'id'             => 'sim_' . uniqid( '', true ),
                            'order_id'       => 0,
                            'customer_name'  => $this->get_random_customer_name(),
                            'product_url'    => $product['url'],
                            'product_image'  => $product['image'],
                            'product_name'   => $product['name'],
                            'product_price'  => $product['price'],
                            'product_rating' => $product['rating'],
                            'time_ago'       => $this->get_random_time_ago(),
                        ];
                    }
                }
                return $list;
            }
        );

        return [
            'purchases'     => $purchases,
            'last_order_id' => null,
        ];
    }

    /**
     * Get real purchase list (cached for initial, delta bypasses cache)
     *
     * @param int      $page_id  Page ID.
     * @param int      $limit    Max purchases.
     * @param int|null $after_id For delta fetch.
     * @return array{ purchases: array, last_order_id: int|null }
     */
    private function get_real_purchase_list( int $page_id, int $limit, ?int $after_id ): array {
        $min_orders = (int) $this->feature->get( 'real_orders.minimum_order_required' );
        $min_orders = $min_orders >= 1 ? $min_orders : 1;
        $apply_min  = $min_orders > 1;

        if ( $apply_min ) {
            $cache_key = self::CACHE_KEY_PREFIX . $page_id;
            $result    = Cache::remember(
                $cache_key,
                self::CACHE_TTL,
                function () use ( $limit, $min_orders ) {
                    $orders    = $this->query_orders( self::QUERY_LIMIT_FOR_MIN_ORDERS, null );
                    $purchases = $this->normalize_orders_to_purchases( $orders );
                    $purchases = $this->filter_purchases_by_minimum_order_required( $purchases, $min_orders, $limit );
                    $last = null;
                    foreach ( $purchases as $p ) {
                        $oid = (int) ( $p['order_id'] ?? 0 );
                        if ( $oid > 0 && ( $last === null || $oid > $last ) ) {
                            $last = $oid;
                        }
                    }
                    return [
                        'purchases'     => $purchases,
                        'last_order_id' => $last,
                    ];
                }
            );
            return $result;
        }

        $is_delta = $after_id > 0;

        if ( $is_delta ) {
            $orders    = $this->query_orders( $limit, $after_id );
            $purchases = $this->normalize_orders_to_purchases( $orders );
            $last      = ! empty( $orders ) ? $this->get_order_id( end( $orders ) ) : null;
            return [
                'purchases'     => $purchases,
                'last_order_id' => $last,
            ];
        }

        $cache_key = self::CACHE_KEY_PREFIX . $page_id;
        $result    = Cache::remember(
            $cache_key,
            self::CACHE_TTL,
            function () use ( $limit ) {
                $orders    = $this->query_orders( $limit, null );
                $purchases = $this->normalize_orders_to_purchases( $orders );
                $last      = ! empty( $orders ) ? $this->get_order_id( end( $orders ) ) : null;
                return [
                    'purchases'     => $purchases,
                    'last_order_id' => $last,
                ];
            }
        );

        return $result;
    }

    /**
     * Query orders (real mode) with optional after_id for delta
     *
     * @param int      $limit   Limit.
     * @param int|null $after_id Exclude orders with ID <= after_id.
     * @return array
     */
    private function query_orders( int $limit, ?int $after_id ): array {
        $order_time_range = $this->feature->get( 'real_orders.order_time_range' );
        $order_status     = $this->feature->get( 'real_orders.order_status' );
        $order_status     = is_array( $order_status ) ? $order_status : [];
        $wc_statuses      = ! empty( $order_status )
            ? array_map( fn( $s ) => ( strpos( (string) $s, 'wc-' ) === 0 ? $s : 'wc-' . $s ), $order_status )
            : [];

        $args = [
            'limit'      => $limit,
            'meta_query' => [
                [
                    'key'     => '_yayboost_recent_purchase_notification_order',
                    'value'   => 'true',
                    'compare' => '=',
                ],
            ],
            'orderby'    => 'date',
            'order'      => 'DESC',
        ];

        if ( ! empty( $wc_statuses ) ) {
            $args['status'] = $wc_statuses;
        }

        $since_ts = $this->get_order_time_range_since_timestamp( $order_time_range );
        if ( $since_ts !== null ) {
            $args['date_created'] = '>' . $since_ts;
        }

        if ( version_compare( WC_VERSION, '7.0', '<' ) ) {
            $wp_args = [
                'post_type'      => 'shop_order',
                'posts_per_page' => $after_id > 0 ? $limit + 50 : $limit,
                'meta_key'       => '_yayboost_recent_purchase_notification_order',
                'meta_value'     => true,
                'orderby'        => 'date',
                'order'          => 'DESC',
            ];
            if ( ! empty( $wc_statuses ) ) {
                $wp_args['post_status'] = $wc_statuses;
            }
            if ( $since_ts !== null ) {
                $wp_args['date_query'] = [
                    [
                        'after'     => gmdate( 'Y-m-d H:i:s', $since_ts ),
                        'inclusive' => true,
                    ],
                ];
            }
            $posts  = get_posts( $wp_args );
            $orders = array_filter(
                array_map( fn( $p ) => wc_get_order( $p->ID ), $posts ),
                fn( $o ) => $o instanceof \WC_Order
            );
            if ( $after_id > 0 ) {
                $orders = array_values( array_filter( $orders, fn( $o ) => $this->get_order_id( $o ) > $after_id ) );
                return array_slice( $orders, 0, $limit );
            }
            return array_values( $orders );
        }//end if

        $orders = wc_get_orders( $args );
        if ( $after_id > 0 && ! empty( $orders ) ) {
            $orders = array_values( array_filter( $orders, fn( $o ) => $this->get_order_id( $o ) > $after_id ) );
            $orders = array_slice( $orders, 0, $limit );
        }
        return $orders;
    }

    /**
     * Get Unix timestamp for "since" based on order_time_range setting
     *
     * @param string|null $order_time_range One of last-24-hours, last-7-days, last-30-days, all-time.
     * @return int|null Timestamp or null for all-time (no filter).
     */
    private function get_order_time_range_since_timestamp( $order_time_range ): ?int {
        if ( empty( $order_time_range ) || $order_time_range === 'all-time' ) {
            return null;
        }
        $now = time();
        switch ( $order_time_range ) {
            case 'last-24-hours':
                return $now - DAY_IN_SECONDS;
            case 'last-7-days':
                return $now - ( 7 * DAY_IN_SECONDS );
            case 'last-30-days':
                return $now - ( 30 * DAY_IN_SECONDS );
            default:
                return null;
        }
    }

    /**
     * Get order ID from order object
     *
     * @param \WC_Order|object $order Order.
     * @return int
     */
    private function get_order_id( $order ): int {
        if ( $order instanceof \WC_Order ) {
            return (int) $order->get_id();
        }
        return isset( $order->ID ) ? (int) $order->ID : 0;
    }

    /**
     * Normalize WC orders to display format
     *
     * @param array $orders WC_Order objects.
     * @return array
     */
    private function normalize_orders_to_purchases( array $orders ): array {
        $purchases = [];
        foreach ( $orders as $order ) {
            if ( ! $order instanceof \WC_Order ) {
                continue;
            }
            $items      = $order->get_items();
            $first_item = reset( $items );
            if ( ! $first_item instanceof \WC_Order_Item_Product ) {
                continue;
            }
            $product = $first_item->get_product();
            if ( ! $product || ! $product->is_visible() ) {
                continue;
            }
            $purchases[] = [
                'id'             => (string) $order->get_id(),
                'order_id'       => (int) $order->get_id(),
                'product_id'     => (int) $product->get_id(),
                'product_url'    => $product->get_permalink(),
                'product_image'  => $this->get_product_image_url( $product ),
                'product_name'   => $product->get_name(),
                'product_price'  => $this->get_product_price_plain( $product ),
                'product_rating' => (float) $product->get_average_rating(),
                'time_ago'       => $this->human_time_diff( $order->get_date_created() ),
            ];
        }//end foreach
        return $purchases;
    }

    /**
     * Filter purchases to only products bought at least $min_orders times; return at most one (most recent) per product.
     *
     * @param array $purchases List of purchase rows (must include product_id).
     * @param int   $min_orders Minimum number of purchases per product to qualify.
     * @param int   $limit Max number of purchases to return.
     * @return array Filtered purchases (one per qualifying product, most recent first).
     */
    private function filter_purchases_by_minimum_order_required( array $purchases, int $min_orders, int $limit ): array {
        if ( $min_orders <= 1 || empty( $purchases ) ) {
            return array_slice( $purchases, 0, $limit );
        }

        $count_by_product = [];
        foreach ( $purchases as $p ) {
            $pid = (int) ( $p['product_id'] ?? 0 );
            if ( $pid > 0 ) {
                $count_by_product[ $pid ] = ( $count_by_product[ $pid ] ?? 0 ) + 1;
            }
        }

        $qualifying_ids = array_keys( array_filter( $count_by_product, fn( $c ) => $c >= $min_orders ) );
        if ( empty( $qualifying_ids ) ) {
            return [];
        }

        $qualifying_ids   = array_flip( $qualifying_ids );
        $seen_product_ids = [];
        $result           = [];
        foreach ( $purchases as $p ) {
            $pid = (int) ( $p['product_id'] ?? 0 );
            if ( ! isset( $qualifying_ids[ $pid ] ) || isset( $seen_product_ids[ $pid ] ) ) {
                continue;
            }
            $seen_product_ids[ $pid ] = true;
            $result[]                = $p;
            if ( count( $result ) >= $limit ) {
                break;
            }
        }
        return $result;
    }

    /**
     * Get product price as plain text for display (avoids raw HTML in notification)
     *
     * @param \WC_Product $product Product.
     * @return string
     */
    private function get_product_price_plain( \WC_Product $product ): string {
        if ( $product->is_on_sale() ) {
            $regular = wc_price( $product->get_regular_price() );
            $sale    = wc_price( $product->get_price() );
            $html    = $regular . ' → ' . $sale;
        } else {
            $html = wc_price( $product->get_price() );
        }
        $plain = html_entity_decode( wp_strip_all_tags( $html ), ENT_QUOTES, get_bloginfo( 'charset' ) );
        return trim( preg_replace( '/\s+/', ' ', $plain ) );
    }

    /**
     * Get product image URL
     *
     * @param \WC_Product $product Product.
     * @return string
     */
    private function get_product_image_url( \WC_Product $product ): string {
        $image_id = $product->get_image_id();
        if ( $image_id ) {
            $url = wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
            if ( $url ) {
                return $url;
            }
        }
        return wc_placeholder_img_src( 'woocommerce_thumbnail' );
    }

    /**
     * Human time diff (e.g. "5 minutes")
     *
     * @param \WC_DateTime|null $date Date.
     * @return string
     */
    private function human_time_diff( $date ): string {
        if ( ! $date ) {
            return '0';
        }
        $ts = $date->getTimestamp();
        return human_time_diff( $ts, time() );
    }

    /**
     * Get random customer name
     *
     * @return string
     */
    private function get_random_customer_name(): string {
        return self::CUSTOMER_NAMES[ array_rand( self::CUSTOMER_NAMES ) ];
    }

    /**
     * Get random product for simulated display
     *
     * @return array{ url: string, image: string, name: string }|null
     */
    private function get_random_product_for_display(): ?array {
        $products = get_posts(
            [
                'post_type'      => 'product',
                'post_status'    => 'publish',
                'posts_per_page' => 50,
            ]
        );
        if ( empty( $products ) ) {
            return null;
        }
        $post    = $products[ array_rand( $products ) ];
        $product = wc_get_product( $post->ID );
        if ( ! $product ) {
            return null;
        }
        return [
            'url'    => $product->get_permalink(),
            'image'  => $this->get_product_image_url( $product ),
            'name'   => $product->get_name(),
            'price'  => $this->get_product_price_plain( $product ),
            'rating' => (float) $product->get_average_rating(),
        ];
    }

    /**
     * Random time ago string for simulated (e.g. "5 minutes", "20 minutes")
     *
     * @return string
     */
    private function get_random_time_ago(): string {
        $mins = wp_rand( 1, 20 );

        return sprintf(
            /* translators: %d: number of minutes */
            _n( '%d minute', '%d minutes', $mins, 'yayboost' ),
            $mins
        );
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
}
