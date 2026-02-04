<?php
/**
 * Analytics Daily Aggregates Table Schema
 *
 * Stores pre-aggregated daily statistics per feature.
 * Used for fast dashboard queries.
 *
 * @package YayBoost
 */

namespace YayBoost\Analytics;

/**
 * Handles analytics daily aggregates table creation and operations
 */
class AnalyticsDailyTable {
    /**
     * Table name without prefix
     */
    const TABLE_NAME = 'yayboost_analytics_daily';

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
     * Create the daily aggregates table
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
            stat_date DATE NOT NULL,
            impressions INT(10) UNSIGNED DEFAULT 0,
            clicks INT(10) UNSIGNED DEFAULT 0,
            add_to_carts INT(10) UNSIGNED DEFAULT 0,
            purchases INT(10) UNSIGNED DEFAULT 0,
            revenue DECIMAL(12,2) DEFAULT 0,
            unique_products INT(10) UNSIGNED DEFAULT 0,
            aggregated_at DATETIME DEFAULT NULL,
            PRIMARY KEY (id),
            UNIQUE KEY unique_feature_date (feature_id, stat_date),
            KEY idx_date (stat_date)
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
     * Upsert daily stats (insert or update)
     *
     * @param string $feature_id    Feature ID
     * @param string $stat_date     Date in Y-m-d format
     * @param array  $stats         Stats to upsert
     * @return bool
     */
    public static function upsert( string $feature_id, string $stat_date, array $stats ): bool {
        global $wpdb;
        $table_name = self::get_table_name();

        $defaults = [
            'impressions'     => 0,
            'clicks'          => 0,
            'add_to_carts'    => 0,
            'purchases'       => 0,
            'revenue'         => 0,
            'unique_products' => 0,
        ];

        $stats = array_merge( $defaults, $stats );

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "INSERT INTO {$table_name}
                    (feature_id, stat_date, impressions, clicks, add_to_carts, purchases, revenue, unique_products, aggregated_at)
                 VALUES (%s, %s, %d, %d, %d, %d, %f, %d, NOW())
                 ON DUPLICATE KEY UPDATE
                    impressions = VALUES(impressions),
                    clicks = VALUES(clicks),
                    add_to_carts = VALUES(add_to_carts),
                    purchases = VALUES(purchases),
                    revenue = VALUES(revenue),
                    unique_products = VALUES(unique_products),
                    aggregated_at = NOW()",
                $feature_id,
                $stat_date,
                $stats['impressions'],
                $stats['clicks'],
                $stats['add_to_carts'],
                $stats['purchases'],
                $stats['revenue'],
                $stats['unique_products']
            )
        );

        return $result !== false;
    }

    /**
     * Increment a specific stat for today
     *
     * @param string $feature_id Feature ID
     * @param string $stat_name  Stat column name (impressions, clicks, etc.)
     * @param float  $value      Value to increment by
     * @return bool
     */
    public static function increment( string $feature_id, string $stat_name, float $value = 1 ): bool {
        global $wpdb;
        $table_name = self::get_table_name();
        $today      = current_time( 'Y-m-d' );

        // Validate stat name to prevent SQL injection
        $allowed_stats = [ 'impressions', 'clicks', 'add_to_carts', 'purchases', 'revenue', 'unique_products' ];
        if ( ! in_array( $stat_name, $allowed_stats, true ) ) {
            return false;
        }

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "INSERT INTO {$table_name}
                    (feature_id, stat_date, {$stat_name}, aggregated_at)
                 VALUES (%s, %s, %f, NOW())
                 ON DUPLICATE KEY UPDATE
                    {$stat_name} = {$stat_name} + %f,
                    aggregated_at = NOW()",
                $feature_id,
                $today,
                $value,
                $value
            )
        );

        return $result !== false;
    }

    /**
     * Get stats for a feature within date range
     *
     * @param string $feature_id Feature ID
     * @param string $start_date Start date (Y-m-d)
     * @param string $end_date   End date (Y-m-d)
     * @return array
     */
    public static function get_stats( string $feature_id, string $start_date, string $end_date ): array {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        return $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT * FROM {$table_name}
                 WHERE feature_id = %s
                   AND stat_date BETWEEN %s AND %s
                 ORDER BY stat_date ASC",
                $feature_id,
                $start_date,
                $end_date
            ),
            ARRAY_A
        );
    }

    /**
     * Get aggregated totals for a feature within date range
     *
     * @param string $feature_id Feature ID
     * @param string $start_date Start date (Y-m-d)
     * @param string $end_date   End date (Y-m-d)
     * @return array
     */
    public static function get_totals( string $feature_id, string $start_date, string $end_date ): array {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->get_row(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT
                    SUM(impressions) as total_impressions,
                    SUM(clicks) as total_clicks,
                    SUM(add_to_carts) as total_add_to_carts,
                    SUM(purchases) as total_purchases,
                    SUM(revenue) as total_revenue,
                    SUM(unique_products) as total_unique_products
                 FROM {$table_name}
                 WHERE feature_id = %s
                   AND stat_date BETWEEN %s AND %s",
                $feature_id,
                $start_date,
                $end_date
            ),
            ARRAY_A
        );

        return $result ?: [
            'total_impressions'     => 0,
            'total_clicks'          => 0,
            'total_add_to_carts'    => 0,
            'total_purchases'       => 0,
            'total_revenue'         => 0,
            'total_unique_products' => 0,
        ];
    }

    /**
     * Get totals for all features within date range
     *
     * @param string $start_date Start date (Y-m-d)
     * @param string $end_date   End date (Y-m-d)
     * @return array Keyed by feature_id
     */
    public static function get_all_features_totals( string $start_date, string $end_date ): array {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $results = $wpdb->get_results(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "SELECT
                    feature_id,
                    SUM(impressions) as total_impressions,
                    SUM(clicks) as total_clicks,
                    SUM(add_to_carts) as total_add_to_carts,
                    SUM(purchases) as total_purchases,
                    SUM(revenue) as total_revenue
                 FROM {$table_name}
                 WHERE stat_date BETWEEN %s AND %s
                 GROUP BY feature_id",
                $start_date,
                $end_date
            ),
            ARRAY_A
        );

        $keyed = [];
        foreach ( $results as $row ) {
            $keyed[ $row['feature_id'] ] = $row;
        }

        return $keyed;
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
}
