<?php
/**
 * Live Visitor Table Schema
 *
 * @package YayBoost
 */

namespace YayBoost\Database;

/**
 * Handles live visitor table creation and management
 */
class LiveVisitorTable {
	/**
	 * Table name (without prefix)
	 */
	const TABLE_NAME = 'yayboost_live_visitor';

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
	 * Create the live visitor table
	 *
	 * @return bool
	 */
	public static function create(): bool {
		global $wpdb;

		$table_name      = self::get_table_name();
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE {$table_name} (
            session_id VARCHAR(64) NOT NULL,
            page_id BIGINT NOT NULL,
            last_active INT NOT NULL,
            PRIMARY KEY (session_id, page_id),
            KEY page_id (page_id),
            KEY session_id (session_id)
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
	 * Drop the live visitor table
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
