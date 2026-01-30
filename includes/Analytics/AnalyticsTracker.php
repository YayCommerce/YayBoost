<?php
/**
 * Analytics Tracker
 *
 * Main class for logging analytics events.
 * Provides simple API for tracking impressions, clicks, add_to_carts, and purchases.
 *
 * @package YayBoost
 */

namespace YayBoost\Analytics;

/**
 * Tracks analytics events for all YayBoost features
 */
class AnalyticsTracker {
    /**
     * Event types
     */
    const EVENT_IMPRESSION  = 'impression';
    const EVENT_CLICK       = 'click';
    const EVENT_ADD_TO_CART = 'add_to_cart';
    const EVENT_PURCHASE    = 'purchase';

    /**
     * Feature IDs
     */
    const FEATURE_FBT             = 'fbt';
    const FEATURE_FREE_SHIPPING   = 'free_shipping_bar';
    const FEATURE_STOCK_SCARCITY  = 'stock_scarcity';
    const FEATURE_NEXT_ORDER      = 'next_order_coupon';
    const FEATURE_RECOMMENDATIONS = 'smart_recommendations';
    const FEATURE_ORDER_BUMP      = 'order_bump';
    const FEATURE_EXIT_INTENT     = 'exit_intent_popup';

    /**
     * Session ID (cached for request)
     *
     * @var string|null
     */
    private static $session_id = null;

    /**
     * Log an analytics event
     *
     * @param string $feature_id Feature identifier
     * @param string $event_type Event type (impression, click, add_to_cart, purchase)
     * @param array  $data       Additional event data
     * @return int|false Insert ID or false on failure
     */
    public static function log( string $feature_id, string $event_type, array $data = [] ) {
        $event_data = [
            'feature_id'         => $feature_id,
            'event_type'         => $event_type,
            'product_id'         => $data['product_id'] ?? null,
            'related_product_id' => $data['related_product_id'] ?? null,
            'order_id'           => $data['order_id'] ?? null,
            'quantity'           => $data['quantity'] ?? 1,
            'revenue'            => $data['revenue'] ?? 0,
            'session_id'         => self::get_session_id(),
            'user_id'            => get_current_user_id() ?: null,
            'metadata'           => $data['metadata'] ?? null,
        ];

        // Log to events table
        $insert_id = AnalyticsEventsTable::insert( $event_data );

        // Also increment daily aggregate for real-time dashboard
        self::increment_daily_stat( $feature_id, $event_type, $data );

        return $insert_id;
    }

    /**
     * Track impression (feature section shown to user)
     *
     * @param string $feature_id Feature ID
     * @param int    $product_id Product ID where shown
     * @param array  $metadata   Optional metadata
     * @return int|false
     */
    public static function impression( string $feature_id, int $product_id, array $metadata = [] ) {
        return self::log(
            $feature_id,
            self::EVENT_IMPRESSION,
            [
                'product_id' => $product_id,
                'metadata'   => $metadata,
            ]
        );
    }

    /**
     * Track click (user interacted with feature)
     *
     * @param string $feature_id         Feature ID
     * @param int    $product_id         Main product ID
     * @param int    $related_product_id Related/clicked product ID
     * @param array  $metadata           Optional metadata
     * @return int|false
     */
    public static function click( string $feature_id, int $product_id, int $related_product_id = null, array $metadata = [] ) {
        return self::log(
            $feature_id,
            self::EVENT_CLICK,
            [
                'product_id'         => $product_id,
                'related_product_id' => $related_product_id,
                'metadata'           => $metadata,
            ]
        );
    }

    /**
     * Track add to cart from feature
     *
     * @param string $feature_id         Feature ID
     * @param int    $product_id         Main product ID
     * @param int    $related_product_id Product added to cart
     * @param int    $quantity           Quantity added
     * @param float  $revenue            Revenue (product price * quantity)
     * @param array  $metadata           Optional metadata
     * @return int|false
     */
    public static function add_to_cart( string $feature_id, int $product_id, int $related_product_id, int $quantity = 1, float $revenue = 0, array $metadata = [] ) {
        return self::log(
            $feature_id,
            self::EVENT_ADD_TO_CART,
            [
                'product_id'         => $product_id,
                'related_product_id' => $related_product_id,
                'quantity'           => $quantity,
                'revenue'            => $revenue,
                'metadata'           => $metadata,
            ]
        );
    }

    /**
     * Track purchase attributed to feature
     *
     * @param string $feature_id         Feature ID
     * @param int    $order_id           Order ID
     * @param int    $product_id         Main product ID
     * @param int    $related_product_id Purchased product from feature
     * @param int    $quantity           Quantity purchased
     * @param float  $revenue            Revenue
     * @param array  $metadata           Optional metadata
     * @return int|false
     */
    public static function purchase( string $feature_id, int $order_id, int $product_id, int $related_product_id, int $quantity = 1, float $revenue = 0, array $metadata = [] ) {
        return self::log(
            $feature_id,
            self::EVENT_PURCHASE,
            [
                'order_id'           => $order_id,
                'product_id'         => $product_id,
                'related_product_id' => $related_product_id,
                'quantity'           => $quantity,
                'revenue'            => $revenue,
                'metadata'           => $metadata,
            ]
        );
    }

    /**
     * Increment daily aggregate stat for real-time dashboard
     *
     * @param string $feature_id Feature ID
     * @param string $event_type Event type
     * @param array  $data       Event data
     * @return void
     */
    private static function increment_daily_stat( string $feature_id, string $event_type, array $data ): void {
        $stat_map = [
            self::EVENT_IMPRESSION  => 'impressions',
            self::EVENT_CLICK       => 'clicks',
            self::EVENT_ADD_TO_CART => 'add_to_carts',
            self::EVENT_PURCHASE    => 'purchases',
        ];

        if ( ! isset( $stat_map[ $event_type ] ) ) {
            return;
        }

        $stat_name = $stat_map[ $event_type ];
        $quantity  = $data['quantity'] ?? 1;

        // Increment count
        AnalyticsDailyTable::increment( $feature_id, $stat_name, $quantity );

        // Increment revenue for purchases
        if ( self::EVENT_PURCHASE === $event_type && ! empty( $data['revenue'] ) ) {
            AnalyticsDailyTable::increment( $feature_id, 'revenue', (float) $data['revenue'] );
        }
    }

    /**
     * Get or generate session ID for current visitor
     *
     * @return string
     */
    private static function get_session_id(): string {
        if ( self::$session_id !== null ) {
            return self::$session_id;
        }

        // Try to get from cookie
        if ( isset( $_COOKIE['yayboost_session'] ) ) {
            self::$session_id = sanitize_text_field( wp_unslash( $_COOKIE['yayboost_session'] ) );
            return self::$session_id;
        }

        // Generate new session ID
        self::$session_id = wp_generate_uuid4();

        // Set cookie for 30 minutes
        if ( ! headers_sent() ) {
            setcookie(
                'yayboost_session',
                self::$session_id,
                time() + ( 30 * MINUTE_IN_SECONDS ),
                COOKIEPATH,
                COOKIE_DOMAIN,
                is_ssl(),
                true
            );
        }

        return self::$session_id;
    }

    /**
     * Check if analytics is enabled
     *
     * @return bool
     */
    public static function is_enabled(): bool {
        // Can add admin setting to disable analytics
        return apply_filters( 'yayboost_analytics_enabled', true );
    }
}
