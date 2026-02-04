<?php
/**
 * FBT Product Stats Table Schema
 *
 * Stores order count per product for accurate threshold calculation.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Handles FBT product stats table creation and operations
 */
class FBTProductStatsTable {
    /**
     * Table name without prefix
     */
    const TABLE_NAME = 'yayboost_fbt_product_stats';

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
     * Create the product stats table
     *
     * @return bool
     */
    public static function create(): bool {
        global $wpdb;

        $table_name      = self::get_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$table_name} (
            product_id BIGINT(20) UNSIGNED NOT NULL,
            order_count INT(10) UNSIGNED DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (product_id)
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
     * Increment order count for a product
     *
     * @param int $product_id Product ID
     * @return bool
     */
    public static function increment_order_count( int $product_id ): bool {
        global $wpdb;
        $table_name = self::get_table_name();

        // Use INSERT ... ON DUPLICATE KEY UPDATE for atomic upsert
        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "INSERT INTO {$table_name} (product_id, order_count, updated_at)
                 VALUES (%d, 1, NOW())
                 ON DUPLICATE KEY UPDATE order_count = order_count + 1, updated_at = NOW()",
                $product_id
            )
        );

        return $result !== false;
    }

    /**
     * Get order count for a product
     *
     * @param int $product_id Product ID
     * @return int
     */
    public static function get_order_count( int $product_id ): int {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $count = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT order_count FROM {$table_name} WHERE product_id = %d", // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                $product_id
            )
        );

        return $count ? (int) $count : 0;
    }

    /**
     * Set order count for a product (used in backfill)
     *
     * @param int $product_id  Product ID
     * @param int $order_count Order count
     * @return bool
     */
    public static function set_order_count( int $product_id, int $order_count ): bool {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query(
            $wpdb->prepare(
                // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
                "INSERT INTO {$table_name} (product_id, order_count, updated_at)
                 VALUES (%d, %d, NOW())
                 ON DUPLICATE KEY UPDATE order_count = %d, updated_at = NOW()",
                $product_id,
                $order_count,
                $order_count
            )
        );

        return $result !== false;
    }

    /**
     * Delete stats for a product
     *
     * @param int $product_id Product ID
     * @return bool
     */
    public static function delete_for_product( int $product_id ): bool {
        global $wpdb;
        $table_name = self::get_table_name();

        $result = $wpdb->delete( $table_name, [ 'product_id' => $product_id ], [ '%d' ] );
        return $result !== false;
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
