<?php
/**
 * Entity Table Schema
 *
 * @package YayBoost
 */

namespace YayBoost\Database;

/**
 * Handles entity table creation and management
 */
class EntityTable {
    /**
     * Table name (without prefix)
     */
    const TABLE_NAME = 'yayboost_entities';

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
     * Create the entities table
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
            entity_type VARCHAR(50) NOT NULL,
            name VARCHAR(255) DEFAULT '',
            settings LONGTEXT DEFAULT NULL,
            status VARCHAR(20) DEFAULT 'active',
            priority INT(11) DEFAULT 10,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_feature (feature_id, entity_type, status),
            KEY idx_status (status),
            KEY idx_priority (priority)
        ) {$charset_collate};";

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
     * Drop the entities table
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
