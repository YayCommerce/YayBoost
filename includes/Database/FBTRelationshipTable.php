<?php
/**
 * FBT Relationship Table Schema
 *
 * Manages the custom database table for storing Frequently Bought Together
 * product pair relationships with occurrence counts.
 *
 * @package YayBoost
 */

namespace YayBoost\Database;

/**
 * Handles FBT relationship table creation and management
 */
class FBTRelationshipTable {
    /**
     * Table name (without prefix)
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
     * Create the FBT relationships table
     *
     * @return bool
     */
    public static function create(): bool {
        global $wpdb;

        $table_name      = self::get_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$table_name} (
            id BIGINT(20) UNSIGNED NOT NULL AUTO_INCREMENT,
            product_a BIGINT(20) UNSIGNED NOT NULL,
            product_b BIGINT(20) UNSIGNED NOT NULL,
            count INT(10) UNSIGNED DEFAULT 0 NOT NULL,
            last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY unique_pair (product_a, product_b),
            KEY idx_product_a (product_a),
            KEY idx_product_b (product_b),
            KEY idx_count (count DESC),
            KEY idx_updated (last_updated)
        ) {$charset_collate} ENGINE=InnoDB;";

        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        dbDelta( $sql );

        // Verify table was created
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
        $query      = $wpdb->prepare(
            'SHOW TABLES LIKE %s',
            $table_name
        );

        return $wpdb->get_var( $query ) === $table_name;
    }

    /**
     * Drop the FBT relationships table
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
        return '1.1.0';
    }
}

