<?php
/**
 * Purchase Activity Count Tracker
 *
 * Handles purchase activity tracking
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PurchaseActivityCount;

use YayBoost\Utils\Cache;

/**
 * Pur tracking and counting operations
 */
class PurchaseActivityCountTracker {

    /**
     * Cache TTL in seconds
     */
    const CACHE_TTL = 30;

    /**
     * Cache key prefix for purchase activity counts
     */
    const CACHE_KEY_PREFIX = 'pac_count_';

    /**
     * Feature instance for accessing settings
     *
     * @var PurchaseActivityCountFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param PurchaseActivityCountFeature $feature Feature instance.
     */
    public function __construct( PurchaseActivityCountFeature $feature ) {
        $this->feature = $feature;
    }

    /**
     * Get purchase activity count for current product (or specific product when in block context)
     *
     * @param int $product_id Optional. Product ID when block is inside product-template. Null for current post/product.
     * @return int count.
     */
    public function get_purchase_activity_count( $product_id = null ): int {
        $page_id = $product_id;
        if ( $page_id === null ) {
            $page_id = $this->get_current_page_id();
        }
        if ( ! $page_id ) {
            return 0;
        }

        // Get date range from settings
        $count_from = $this->feature->get( 'count_from' ) ?? 'all';

        // Build cache key with date range info
        $cache_key = self::CACHE_KEY_PREFIX . $page_id;

        return Cache::remember(
            $cache_key,
            self::CACHE_TTL,
            fn() => $this->count_purchase_activity( $page_id, $count_from )
        );
    }

    /**
     * Count purchase activity for a specific product
     *
     * @param int    $product_id Product ID.
     * @param string $count_from Count from setting ('all' or 'period').
     * @param array  $period_date Date range array with 'from' and 'to' keys.
     * @return int Purchase activity count.
     */
    public function count_purchase_activity( int $product_id, string $count_from = 'all' ): int {
        $count = 0;

        // Determine date range
        $date_from = null;
        $date_to   = null;

        if ( 'all' !== $count_from  ) {
            $date_range = $this->get_date_range_from_period( $count_from );
            $date_from  = $date_range['from'];
            $date_to    = $date_range['to'];
        }

        // query count orders for product
        $count = $this->count_orders_by_product_id( $product_id, $date_from, $date_to );
        return (int) $count;
    }


    /**
     * Get date range from period
     *
     * @param string $period Period.
     * @return array Date range.
     */
    private function get_date_range_from_period( string $period ): array {
        switch ( $period ) {
            case 'past_week':
                return [
                    'from' => gmdate( 'Y-m-d', strtotime( '-7 days' ) ),
                    'to'   => gmdate( 'Y-m-d' ),
                ];
            case 'past_month':
                return [
                    'from' => gmdate( 'Y-m-d', strtotime( '-30 days' ) ),
                    'to'   => gmdate( 'Y-m-d' ),
                ];
            case 'this_week':
                return [
                    'from' => gmdate( 'Y-m-d', strtotime( 'this week' ) ),
                    'to'   => gmdate( 'Y-m-d' ),
                ];
            case 'this_month':
                return [
                    'from' => gmdate( 'Y-m-d', strtotime( 'first day of this month' ) ),
                    'to'   => gmdate( 'Y-m-d' ),
                ];
            case 'this_year':
                return [
                    'from' => gmdate( 'Y-m-d', strtotime( 'first day of this year' ) ),
                    'to'   => gmdate( 'Y-m-d' ),
                ];
            default:
                return [
                    'from' => gmdate( 'Y-m-d', strtotime( '-7 days' ) ),
                    'to'   => gmdate( 'Y-m-d' ),
                ];
        }//end switch
    }//end get_date_range_from_period()

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
     * Count orders by product ID
     *
     * @param int    $product_id Product ID.
     * @param string $date_from  Start date (ISO format) or null for all time.
     * @param string $date_to    End date (ISO format) or null for all time.
     * @return int Order count.
     */
    private function count_orders_by_product_id( int $product_id, ?string $date_from = null, ?string $date_to = null ): int {
        global $wpdb;

        // Get product to determine type
        $product = wc_get_product( $product_id );
        if ( ! $product ) {
            return 0;
        }

        $is_variation = $product->is_type( 'variation' );
        $is_variable  = $product->is_type( 'variable' );
        $is_simple    = $product->is_type( 'simple' );

        $prepare_args  = [];
        $product_where = '';

        if ( $is_simple ) {
            // Simple product: just match product_id
            $product_where  = 'product_meta.meta_value = %d';
            $prepare_args[] = $product_id;
        } elseif ( $is_variation ) {
            // Variation: match parent product_id AND specific variation_id
            $parent_id      = $product->get_parent_id();
            $product_where  = 'product_meta.meta_value = %d AND variation_meta.meta_value = %d';
            $prepare_args[] = $parent_id;
            $prepare_args[] = $product_id;
        } elseif ( $is_variable ) {
            // Variable product: match parent product_id AND any of its variations
            $variations = $product->get_children();
            if ( empty( $variations ) ) {
                return 0;
            }
            $variation_ids  = array_map( 'intval', $variations );
            $placeholders   = implode( ',', array_fill( 0, count( $variation_ids ), '%d' ) );
            $product_where  = "product_meta.meta_value = %d AND variation_meta.meta_value IN ($placeholders)";
            $prepare_args[] = $product_id;
            $prepare_args   = array_merge( $prepare_args, $variation_ids );
        } else {
            // Fallback for other product types
            $product_where  = 'product_meta.meta_value = %d';
            $prepare_args[] = $product_id;
        }//end if

        // Base query - handle both legacy posts table and HPOS
        // Check if using HPOS (High-Performance Order Storage)
        $using_hpos = class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' )
            && \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();

        if ( $using_hpos ) {
            // HPOS: Use wc_orders table
            $query = "
                SELECT COUNT(DISTINCT order_items.order_id)
                FROM {$wpdb->prefix}woocommerce_order_items AS order_items
                INNER JOIN {$wpdb->prefix}woocommerce_order_itemmeta AS product_meta
                    ON order_items.order_item_id = product_meta.order_item_id
                    AND product_meta.meta_key = '_product_id'
                LEFT JOIN {$wpdb->prefix}woocommerce_order_itemmeta AS variation_meta
                    ON order_items.order_item_id = variation_meta.order_item_id
                    AND variation_meta.meta_key = '_variation_id'
                INNER JOIN {$wpdb->prefix}wc_orders AS orders
                    ON order_items.order_id = orders.id
                WHERE order_items.order_item_type = 'line_item'
                AND $product_where
            ";
        } else {
            // Legacy: Use posts table
            $query = "
                SELECT COUNT(DISTINCT order_items.order_id)
                FROM {$wpdb->prefix}woocommerce_order_items AS order_items
                INNER JOIN {$wpdb->prefix}woocommerce_order_itemmeta AS product_meta
                    ON order_items.order_item_id = product_meta.order_item_id
                    AND product_meta.meta_key = '_product_id'
                LEFT JOIN {$wpdb->prefix}woocommerce_order_itemmeta AS variation_meta
                    ON order_items.order_item_id = variation_meta.order_item_id
                    AND variation_meta.meta_key = '_variation_id'
                INNER JOIN {$wpdb->posts} AS posts
                    ON order_items.order_id = posts.ID
                WHERE posts.post_type = 'shop_order'
                AND order_items.order_item_type = 'line_item'
                AND $product_where
            ";
        }//end if

        // Add date range filtering if provided
        if ( $date_from && $date_to ) {
            // Convert ISO date strings to MySQL datetime format
            $date_from_mysql = $this->convert_date_to_mysql( $date_from );
            $date_to_mysql   = $this->convert_date_to_mysql( $date_to, true );

            if ( $date_from_mysql && $date_to_mysql ) {
                // Use appropriate date column based on storage system
                $date_column    = $using_hpos ? 'orders.date_created_gmt' : 'posts.post_date';
                $query         .= " AND $date_column >= %s AND $date_column <= %s";
                $prepare_args[] = $date_from_mysql;
                $prepare_args[] = $date_to_mysql;
            }
        }

        $count = $wpdb->get_var(
            $wpdb->prepare( $query, ...$prepare_args )
        );

        return (int) $count;
    }

    /**
     * Convert ISO date string to MySQL datetime format
     *
     * @param string $date_string ISO date string.
     * @param bool   $end_of_day  Whether to set time to end of day (23:59:59).
     * @return string|null MySQL datetime string or null on failure.
     */
    private function convert_date_to_mysql( string $date_string, bool $end_of_day = false ): ?string {
        if ( empty( $date_string ) ) {
            return null;
        }

        try {
            // Try to parse the date string
            $date = new \DateTime( $date_string );

            if ( $end_of_day ) {
                $date->setTime( 23, 59, 59 );
            } else {
                $date->setTime( 0, 0, 0 );
            }

            return $date->format( 'Y-m-d H:i:s' );
        } catch ( \Exception $e ) {
            return null;
        }
    }

    /**
     * Update purchase activity count for a specific product
     *
     * @param int $product_id Product ID.
     * @return void
     */
    public function update_purchase_activity_count( int $product_id ): void {
        Cache::forget( self::CACHE_KEY_PREFIX . $product_id );
        $count = $this->count_purchase_activity( $product_id );
        $this->set_cached_count( $product_id, $count );
    }

    /**
     * Get cached purchase activity count (for AJAX handler)
     *
     * @param int $page_id Page ID.
     * @return int|false Count or false if not cached.
     */
    public function get_cached_count( int $page_id ) {
        return Cache::get( self::CACHE_KEY_PREFIX . $page_id, false );
    }

    /**
     * Set cached purchase activity count (for AJAX handler)
     *
     * @param int $page_id Page ID.
     * @param int $count Count.
     * @return bool Success.
     */
    public function set_cached_count( int $page_id, int $count ): bool {
        return Cache::set( self::CACHE_KEY_PREFIX . $page_id, $count, self::CACHE_TTL );
    }
}
