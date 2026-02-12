<?php
/**
 * Email Capture Table Schema
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

defined( 'ABSPATH' ) || exit;

/**
 * Handles email capture table creation and management
 */
class EmailCaptureTable {

    /**
     * Table name (without prefix)
     */
    const TABLE_NAME = 'yayboost_captured_email';

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
     * Create the email capture table
     *
     * @return bool
     */
    public static function create(): bool {
        global $wpdb;

        $table_name      = self::get_table_name();
        $charset_collate = $wpdb->get_charset_collate();

        $sql = "CREATE TABLE {$table_name} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			email VARCHAR(255) NOT NULL,
			status VARCHAR(32) NOT NULL DEFAULT 'pending',
			captured_at DATETIME NOT NULL,
			scheduled_at DATETIME NOT NULL,
			sent_at DATETIME NULL DEFAULT NULL,
			source VARCHAR(50) NOT NULL DEFAULT 'email_capture_popup',
			session_id VARCHAR(64) NULL DEFAULT NULL,
			PRIMARY KEY (id),
			KEY email (email),
			KEY status (status),
			KEY scheduled_at (scheduled_at),
			KEY email_status (email, status)
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
        $query      = $wpdb->prepare(
            'SHOW TABLES LIKE %s',
            $table_name
        );

        return $wpdb->get_var( $query ) === $table_name; // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
    }

    /**
     * Drop the email capture table
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
