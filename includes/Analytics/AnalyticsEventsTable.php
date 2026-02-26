<?php
/**
 * Analytics Events Table Schema
 *
 * Stores raw analytics events for detailed analysis.
 * Events are retained for configurable period (default 30 days).
 *
 * @package YayBoost
 */

namespace YayBoost\Analytics;

/**
 * Handles analytics events table creation and operations
 */
class AnalyticsEventsTable {
    /**
     * Table name without prefix
     */
    const TABLE_NAME = 'yayboost_analytics_events';

    /**
     * Get full table name with prefix
     *
     * @return string
     */
    public static function get_table_name(): string {
        global $wpdb;
        return $wpdb->prefix . self::TABLE_NAME;
    }

    /**
     * Create the events table
     *
     * @return bool
     */
    public static function create(): bool {
        global $wpdb;

        $table_name      = self::get_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$table_name} (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            feature_id VARCHAR(50) NOT NULL,
            event_type VARCHAR(30) NOT NULL,
            product_id BIGINT(20) UNSIGNED DEFAULT NULL,
            related_product_id BIGINT(20) UNSIGNED DEFAULT NULL,
            order_id BIGINT(20) UNSIGNED DEFAULT NULL,
            quantity INT(10) UNSIGNED DEFAULT 1,
            revenue DECIMAL(10,2) DEFAULT 0,
            session_id VARCHAR(64) DEFAULT NULL,
            user_id BIGINT(20) UNSIGNED DEFAULT NULL,
            metadata JSON DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_feature_type_date (feature_id, event_type, created_at),
            KEY idx_product (product_id, created_at),
            KEY idx_cleanup (created_at)
        ) {$charset_collate};";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );

        return self::exists();
    }

    /**
     * Check if table exists
     *
     * @return bool
     */
    public static function exists(): bool {
        global $wpdb;
        $table_name = self::get_table_name();
        $query      = $wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name );
        return $wpdb->get_var( $query ) === $table_name; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    }

    /**
     * Insert an event
     *
     * @param array $data Event data
     * @return int|false Insert ID or false on failure
     */
    public static function insert( array $data ) {
        global $wpdb;

        $defaults = [
            'feature_id'         => '',
            'event_type'         => '',
            'product_id'         => null,
            'related_product_id' => null,
            'order_id'           => null,
            'quantity'           => 1,
            'revenue'            => 0,
            'session_id'         => null,
            'user_id'            => null,
            'metadata'           => null,
            'created_at'         => current_time( 'mysql' ),
        ];

        $data = array_merge( $defaults, $data );

        // Encode metadata as JSON if array
        if ( is_array( $data['metadata'] ) ) {
            $data['metadata'] = wp_json_encode( $data['metadata'] );
        }

        $result = $wpdb->insert(
            self::get_table_name(),
            $data,
            [
                '%s',
                // feature_id
                                    '%s',
                // event_type
                                    '%d',
                // product_id
                                    '%d',
                // related_product_id
                                    '%d',
                // order_id
                                    '%d',
                // quantity
                                    '%f',
                // revenue
                                    '%s',
                // session_id
                                    '%d',
                // user_id
                                    '%s',
                // metadata
                                    '%s',
            // created_at
            ]
        );

        return $result ? $wpdb->insert_id : false;
    }

    /**
     * Delete events older than specified days
     *
     * @param int $days        Retention period in days
     * @param int $batch_size  Max rows to delete per call
     * @return int Number of deleted rows
     */
    public static function cleanup( int $days = 30, int $batch_size = 10000 ): int {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "DELETE FROM {$table_name}
                 WHERE created_at < DATE_SUB(NOW(), INTERVAL %d DAY)
                 LIMIT %d",
                $days,
                $batch_size
            )
        );

        return $result !== false ? $result : 0;
    }

    /**
     * Get events for aggregation
     *
     * @param string $date Date in Y-m-d format
     * @return array
     */
    public static function get_events_for_date( string $date ): array {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        return $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT
                    feature_id,
                    event_type,
                    COUNT(*) as event_count,
                    SUM(quantity) as total_quantity,
                    SUM(revenue) as total_revenue,
                    COUNT(DISTINCT product_id) as unique_products
                 FROM {$table_name}
                 WHERE DATE(created_at) = %s
                 GROUP BY feature_id, event_type",
                $date
            ),
            ARRAY_A
        );
    }

    /**
     * Get order-level purchase totals for a date range.
     *
     * Aggregates unique orders that have at least one purchase event.
     * Revenue per order:
     * - FBT-only orders: SUM(revenue) of all FBT items.
     * - Mixed orders (FBT + Exit Intent / Next Order): MAX(revenue) to avoid double-counting.
     *
     * @param string $start_date Start date (Y-m-d).
     * @param string $end_date   End date (Y-m-d).
     * @return array{orders_count:int,orders_revenue:float}
     */
    public static function get_purchase_order_totals( string $start_date, string $end_date ): array {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $row = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT
                    COUNT(*) AS orders_count,
                    COALESCE(SUM(order_revenue), 0) AS orders_revenue
                 FROM (
                    SELECT
                        order_id,
                        CASE
                            WHEN COUNT(DISTINCT feature_id) = 1 AND MAX(feature_id) = %s THEN SUM(revenue)
                            ELSE MAX(revenue)
                        END AS order_revenue
                    FROM {$table_name}
                    WHERE event_type = %s
                      AND order_id IS NOT NULL
                      AND DATE(created_at) BETWEEN %s AND %s
                    GROUP BY order_id
                 ) AS t",
                'fbt',
                'purchase',
                $start_date,
                $end_date
            ),
            ARRAY_A
        );

        if ( ! $row ) {
            return [
                'orders_count'   => 0,
                'orders_revenue' => 0.0,
            ];
        }

        return [
            'orders_count'   => (int) $row['orders_count'],
            'orders_revenue' => (float) $row['orders_revenue'],
        ];
    }

    /**
     * Drop the table
     *
     * @return bool
     */
    public static function drop(): bool {
        global $wpdb;
        $table_name = self::get_table_name();
        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query( "DROP TABLE IF EXISTS {$table_name}" );
        return ! self::exists();
    }

    /**
     * Get table version for migrations
     *
     * @return string
     */
    public static function get_version(): string {
        return '1.0.0';
    }

    /**
     * Get recent activity events for dashboard feed
     *
     * Returns recent significant events (purchases, threshold_reached, add_to_cart)
     *
     * @param int $limit Max number of events to return
     * @return array
     */
    public static function get_recent_activity( int $limit = 10 ): array {
        global $wpdb;
        $table_name = self::get_table_name();

        // Event types we want to show in activity feed
        $event_types  = [ 'purchase', 'threshold_reached', 'add_to_cart', 'click' ];
        $placeholders = implode( ',', array_fill( 0, count( $event_types ), '%s' ) );

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT
                    id,
                    feature_id,
                    event_type,
                    product_id,
                    order_id,
                    quantity,
                    revenue,
                    metadata,
                    created_at
                 FROM {$table_name}
                 WHERE event_type IN ({$placeholders})
                 ORDER BY created_at DESC
                 LIMIT %d",
                ...array_merge( $event_types, [ $limit ] )
            ),
            ARRAY_A
        );

        return $results ?: [];
    }
}
