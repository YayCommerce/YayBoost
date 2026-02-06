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
     * User meta key for logged-in users
     */
    const META_KEY = '_yayboost_recent_purchase';

    /**
     * Cookie name for guest token
     */
    const COOKIE_NAME = 'yayboost_recent_purchase_token';

    /**
     * Transient prefix for guest state
     */
    const TRANSIENT_PREFIX = 'yayboost_recent_purchase_guest_';

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
     * Cached state to avoid repeated lookups
     *
     * @var array|null
     */
    private $cached_state = null;

    /**
     * Constructor
     *
     * @param RecentPurchaseNotificationFeature $feature Feature instance.
     */
    public function __construct( RecentPurchaseNotificationFeature $feature ) {
        $this->feature = $feature;
    }

    /**
     * Get current notification state
     *
     * @return array|null
     */
    public function get_state(): ?array {
        if ( null !== $this->cached_state ) {
            return $this->cached_state;
        }

        $state = is_user_logged_in()
            ? $this->get_user_state()
            : $this->get_guest_state();

        if ( $state && ! empty( $state['expires_at'] ) && time() > (int) $state['expires_at'] ) {
            $this->clear_state();
            $state = null;
        }

        $this->cached_state = $state;
        return $state;
    }

    /**
     * Whether to persist "notification shown" state (user meta / cookie).
     * False when tracking mode is simulated.
     *
     * @return bool
     */
    public function should_persist_shown_state(): bool {
        return $this->feature->get( 'tracking_mode' ) !== 'simulated';
    }

    /**
     * Max number of shown purchase IDs to keep in state (avoid bloat)
     */
    const SHOWN_IDS_MAX = 100;

    /**
     * Mark notification as shown (persists for logged-in users or guests)
     *
     * @param string $purchase_id Purchase identifier shown.
     * @param int    $page_id     Page ID where shown.
     * @return void
     */
    public function mark_notification_shown( string $purchase_id, int $page_id ): void {
        $state                     = $this->get_state() ?? [];
        $state['last_shown_at']    = time();
        $state['last_purchase_id'] = sanitize_text_field( $purchase_id );
        if ( $page_id > 0 ) {
            $state['page_id'] = absint( $page_id );
        }
        $state['expires_at'] = $state['expires_at'] ?? $this->get_storage_expiry();

        $shown_ids = $state['shown_ids'] ?? [];
        $id_to_add = $state['last_purchase_id'];
        if ( $id_to_add !== '' && ! in_array( $id_to_add, $shown_ids, true ) ) {
            $shown_ids[]        = $id_to_add;
            $state['shown_ids'] = array_slice( $shown_ids, -self::SHOWN_IDS_MAX );
        }

        $this->set_state( $state );
    }

    /**
     * Get purchase IDs already shown to this visitor (from user meta or guest cookie).
     * Used to exclude them from the purchase list.
     *
     * @return string[]
     */
    public function get_shown_purchase_ids(): array {
        if ( ! $this->should_persist_shown_state() ) {
            return [];
        }
        $state = $this->get_state();
        if ( ! $state || empty( $state['shown_ids'] ) ) {
            return [];
        }
        return array_values( (array) $state['shown_ids'] );
    }

    /**
     * Clear persisted state
     *
     * @return void
     */
    public function clear_state(): void {
        if ( is_user_logged_in() ) {
            delete_user_meta( get_current_user_id(), self::META_KEY );
        } else {
            $token = $this->get_guest_token();
            if ( $token ) {
                delete_transient( self::TRANSIENT_PREFIX . md5( $token ) );
            }
        }

        $this->cached_state = null;
    }

    /**
     * Set state for current visitor (user meta or guest transient)
     *
     * @param array $data State data.
     * @return void
     */
    private function set_state( array $data ): void {
        if ( empty( $data['expires_at'] ) ) {
            $data['expires_at'] = $this->get_storage_expiry();
        }

        if ( is_user_logged_in() ) {
            $this->set_user_state( $data );
        } else {
            $this->set_guest_state( $data );
        }

        $this->cached_state = $data;
    }

    /**
     * Get state for logged-in user
     *
     * @return array|null
     */
    private function get_user_state(): ?array {
        $user_id = get_current_user_id();
        if ( ! $user_id ) {
            return null;
        }

        $data = get_user_meta( $user_id, self::META_KEY, true );
        return is_array( $data ) ? $data : null;
    }

    /**
     * Set state for logged-in user
     *
     * @param array $data State data.
     * @return void
     */
    private function set_user_state( array $data ): void {
        $user_id = get_current_user_id();
        if ( ! $user_id ) {
            return;
        }

        update_user_meta( $user_id, self::META_KEY, $data );
    }

    /**
     * Get state for guest visitor
     *
     * @return array|null
     */
    private function get_guest_state(): ?array {
        $token = $this->get_guest_token();
        if ( ! $token ) {
            return null;
        }

        $key  = self::TRANSIENT_PREFIX . md5( $token );
        $data = get_transient( $key );
        return is_array( $data ) ? $data : null;
    }

    /**
     * Set state for guest visitor (transient + HttpOnly cookie)
     *
     * @param array $data State data.
     * @return void
     */
    private function set_guest_state( array $data ): void {
        $token = $this->get_guest_token();
        if ( ! $token ) {
            $token = $this->generate_guest_token();
            $this->set_guest_token( $token, $data['expires_at'] ?? $this->get_storage_expiry() );
        }

        $key = self::TRANSIENT_PREFIX . md5( $token );
        $ttl = max( HOUR_IN_SECONDS, ( $data['expires_at'] ?? $this->get_storage_expiry() ) - time() );
        set_transient( $key, $data, $ttl );
    }

    /**
     * Get guest token from cookie
     *
     * @return string|null
     */
    private function get_guest_token(): ?string {
        return isset( $_COOKIE[ self::COOKIE_NAME ] )
            ? sanitize_text_field( wp_unslash( $_COOKIE[ self::COOKIE_NAME ] ) )
            : null;
    }

    /**
     * Set guest token cookie
     *
     * @param string $token  Token value.
     * @param int    $expiry Expiration timestamp.
     * @return void
     */
    private function set_guest_token( string $token, int $expiry ): void {
        $secure = is_ssl();
        setcookie(
            self::COOKIE_NAME,
            $token,
            [
                'expires'  => $expiry,
                'path'     => COOKIEPATH,
                'domain'   => COOKIE_DOMAIN,
                'secure'   => $secure,
                'httponly' => true,
                'samesite' => 'Lax',
            ]
        );

        // Make available immediately in current request.
        $_COOKIE[ self::COOKIE_NAME ] = $token;
    }

    /**
     * Generate random token for guest visitor
     *
     * @return string
     */
    private function generate_guest_token(): string {
        return bin2hex( random_bytes( 16 ) );
    }

    /**
     * Get storage expiry timestamp (30 days)
     *
     * @return int
     */
    private function get_storage_expiry(): int {
        return time() + ( 30 * DAY_IN_SECONDS );
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
            $result = $this->get_simulated_purchase_list( $page_id );
        } else {
            $result = $this->get_real_purchase_list( $page_id, $limit, $after_id );
        }

        return $result;
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
                for ( $i = 0; $i < 5; $i++ ) {
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
     * When user is logged in, excludes orders belonging to the current user
     * so they only see purchases from other customers.
     *
     * @param int      $page_id  Page ID.
     * @param int      $limit    Max purchases.
     * @param int|null $after_id For delta fetch.
     * @return array{ purchases: array, last_order_id: int|null }
     */
    private function get_real_purchase_list( int $page_id, int $limit, ?int $after_id ): array {
        $is_delta        = $after_id > 0;
        $shown_ids       = $this->get_shown_purchase_ids();
        $current_user_id = get_current_user_id();
        $exclude_user_id = $current_user_id > 0 ? $current_user_id : null;
        $cache_key       = self::CACHE_KEY_PREFIX . $page_id . ( $exclude_user_id ? '_u' . $exclude_user_id : '' );
        if ( $is_delta ) {
            return $this->get_purchase_list_cache( $cache_key, $limit, $shown_ids, $exclude_user_id );
        }

        return $this->get_purchase_list_cache( $cache_key, $limit, $shown_ids, $exclude_user_id );
    }

    /**
     * Get purchase list cache
     *
     * @param string   $cache_key Cache key.
     * @param int      $limit Limit.
     * @param array    $shown_ids Shown IDs.
     * @param int|null $exclude_user_id Exclude user ID.
     * @return array
     */
    private function get_purchase_list_cache( string $cache_key, int $limit, array $shown_ids, ?int $exclude_user_id = null ): array {
        $result = Cache::remember(
            $cache_key,
            self::CACHE_TTL,
            function () use ( $limit, $shown_ids, $exclude_user_id ) {
                $orders    = $this->query_orders( $limit, null, $exclude_user_id );
                $purchases = $this->normalize_orders_to_purchases( $orders, $shown_ids );
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
     * @param int      $limit              Limit.
     * @param int|null $after_id           Exclude orders with ID <= after_id.
     * @param int|null $exclude_customer_id When set (logged-in user), exclude orders from this customer.
     * @return array
     */
    private function query_orders( int $limit, ?int $after_id, ?int $exclude_customer_id = null ): array {
        $order_time_range = $this->feature->get( 'real_orders.order_time_range' );
        $order_status     = [ 'wc-processing', 'wc-completed', 'wc-on-hold' ];

        $args = [
            'status'  => $order_status,
            'limit'   => $limit,
            'orderby' => 'date',
            'order'   => 'DESC',
        ];

        $since_ts = $this->get_order_time_range_since_timestamp( $order_time_range );
        if ( $since_ts !== null ) {
            $args['date_created'] = '>' . $since_ts;
        }

        $fetch_limit = $limit;
        if ( $exclude_customer_id ) {
            $fetch_limit = ( $after_id > 0 ? $limit + 50 : $limit ) * 2;
        }

        if ( version_compare( WC_VERSION, '7.0', '<' ) ) {
            $wp_args = [
                'post_type'      => 'shop_order',
                'posts_per_page' => $after_id > 0 ? $fetch_limit + 50 : $fetch_limit,
                'orderby'        => 'date',
                'order'          => 'DESC',
                'post_status'    => $order_status,
            ];

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
            }
            $orders = $this->exclude_customer_orders( $orders, $exclude_customer_id );
            return array_slice( array_values( $orders ), 0, $limit );
        }//end if

        $args['limit'] = $fetch_limit;
        $orders        = wc_get_orders( $args );
        if ( $after_id > 0 && ! empty( $orders ) ) {
            $orders = array_values( array_filter( $orders, fn( $o ) => $this->get_order_id( $o ) > $after_id ) );
        }
        $orders = $this->exclude_customer_orders( $orders, $exclude_customer_id );
        return array_slice( array_values( $orders ), 0, $limit );
    }

    /**
     * Filter out orders belonging to a specific customer
     *
     * @param array    $orders WC_Order objects.
     * @param int|null $exclude_customer_id Customer ID to exclude (e.g. current logged-in user).
     * @return array Filtered orders.
     */
    private function exclude_customer_orders( array $orders, ?int $exclude_customer_id ): array {
        if ( ! $exclude_customer_id ) {
            return $orders;
        }
        return array_values(
            array_filter(
                $orders,
                function ( $order ) use ( $exclude_customer_id ) {
                    if ( ! $order instanceof \WC_Order ) {
                        return true;
                    }
                    return (int) $order->get_customer_id() !== $exclude_customer_id;
                }
            )
        );
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
    private function normalize_orders_to_purchases( array $orders, array $shown_ids ): array {
        $purchases = [];
        foreach ( $orders as $order ) {
            if ( ! $order instanceof \WC_Order ) {
                continue;
            }
            $items = $order->get_items();
            foreach ( $items as $item ) {
                if ( ! $item instanceof \WC_Order_Item_Product ) {
                    continue;
                }
                $product = $item->get_product();
                if ( ! $product || ! $product->is_visible() ) {
                    continue;
                }
                $id = $order->get_id() . '_' . $product->get_id();
                if ( in_array( $id, $shown_ids, true ) ) {
                    continue;
                }
                $purchases[] = [
                    'id'             => (string) $id,
                    'customer_name'  => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
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

        }//end foreach
        return $purchases;
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
            $html    = $regular . ' - ' . $sale;
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
        // Get simple products (product type is taxonomy, not meta)
        $args     = [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => 50,
            'tax_query'      => [
                [
                    'taxonomy' => 'product_type',
                    'field'    => 'slug',
                    'terms'    => 'simple',
                ],
            ],
        ];
        $products = get_posts( $args );

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
}
