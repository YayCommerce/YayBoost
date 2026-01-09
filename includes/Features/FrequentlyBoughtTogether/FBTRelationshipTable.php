<?php
/**
 * FBT Relationship Table Schema
 *
 * Stores product pair relationships with co-purchase counts.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Handles FBT relationship table creation and operations
 */
class FBTRelationshipTable {
    /**
     * Table name without prefix
     */
    const TABLE_NAME = 'yayboost_fbt_relationships';

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
     * Create the relationships table
     *
     * @return bool
     */
    public static function create(): bool {
        global $wpdb;

        $table_name      = self::get_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$table_name} (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            product_id BIGINT(20) UNSIGNED NOT NULL,
            related_product_id BIGINT(20) UNSIGNED NOT NULL,
            co_purchase_count INT(10) UNSIGNED DEFAULT 1,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_pair (product_id, related_product_id),
            KEY idx_product (product_id),
            KEY idx_count (product_id, co_purchase_count)
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
        return $wpdb->get_var( $query ) === $table_name;
    }

    /**
     * Increment co-purchase count for a product pair
     *
     * @param int $product_id         Source product ID
     * @param int $related_product_id Related product ID
     * @return bool
     */
    public static function increment_count( int $product_id, int $related_product_id ): bool {
        global $wpdb;
        $table_name = self::get_table_name();

        // Use INSERT ... ON DUPLICATE KEY UPDATE for atomic upsert
        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query(
            $wpdb->prepare(
                "INSERT INTO {$table_name} (product_id, related_product_id, co_purchase_count, updated_at)
                 VALUES (%d, %d, 1, NOW())
                 ON DUPLICATE KEY UPDATE co_purchase_count = co_purchase_count + 1, updated_at = NOW()",
                $product_id,
                $related_product_id
            )
        );

        return $result !== false;
    }

    /**
     * Get related products for a product with threshold filtering
     *
     * @param int $product_id      Product ID
     * @param int $threshold       Min percentage threshold
     * @param int $limit           Max results
     * @param int $product_orders  Total orders for this product
     * @return array Array of related product IDs
     */
    public static function get_related_products( int $product_id, int $threshold, int $limit, int $product_orders ): array {
        global $wpdb;
        $table_name = self::get_table_name();

        if ( $product_orders <= 0 ) {
            return [];
        }

        // Calculate minimum count needed for threshold
        $min_count = ceil( $product_orders * $threshold / 100 );

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $results = $wpdb->get_col(
            $wpdb->prepare(
                "SELECT related_product_id
                 FROM {$table_name}
                 WHERE product_id = %d
                   AND co_purchase_count >= %d
                 ORDER BY co_purchase_count DESC
                 LIMIT %d",
                $product_id,
                $min_count,
                $limit
            )
        );

        return array_map( 'intval', $results ?: [] );
    }

    /**
     * Delete all relationships for a product
     *
     * @param int $product_id Product ID
     * @return int Number of deleted rows
     */
    public static function delete_for_product( int $product_id ): int {
        global $wpdb;
        $table_name = self::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $result = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$table_name} WHERE product_id = %d OR related_product_id = %d",
                $product_id,
                $product_id
            )
        );

        return $result !== false ? (int) $result : 0;
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
