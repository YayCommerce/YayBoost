<?php
/**
 * Database Migrator
 *
 * @package YayBoost
 */

namespace YayBoost\Database;

/**
 * Handles database migrations on plugin activation/update
 */
class Migrator {
	/**
	 * Option name for storing DB version
	 */
	const DB_VERSION_OPTION = 'yayboost_db_version';

	/**
	 * Current DB version
	 */
	const CURRENT_VERSION = '1.0.0';

	/**
	 * Run migrations only if needed
	 *
	 * @return void
	 */
	public static function run(): void {
		// Skip if not needed (avoids DB query on every request)
		if ( ! self::needs_migration() ) {
			return;
		}

		$installed_version = get_option( self::DB_VERSION_OPTION, '0.0.0' );
		self::migrate( $installed_version );
		update_option( self::DB_VERSION_OPTION, self::CURRENT_VERSION );
	}

	/**
	 * Run migrations on plugin activation (use with register_activation_hook)
	 *
	 * @return void
	 */
	public static function activate(): void {
		$installed_version = get_option( self::DB_VERSION_OPTION, '0.0.0' );

		if ( version_compare( $installed_version, self::CURRENT_VERSION, '<' ) ) {
			self::migrate( $installed_version );
			update_option( self::DB_VERSION_OPTION, self::CURRENT_VERSION );
		}
	}

	/**
	 * Perform migrations based on version
	 *
	 * @param string $from_version
	 * @return void
	 */
	protected static function migrate( string $from_version ): void {
		// Create entities table
		EntityTable::create();
		LiveVisitorTable::create();
		// Create FBT relationships table
		FBTRelationshipTable::create();
		// Create FBT product stats table for accurate threshold calculations
		FBTProductStatsTable::create();
	}

	/**
	 * Check if migrations are needed (with caching)
	 *
	 * @return bool
	 */
	public static function needs_migration(): bool {
		// Check transient first to avoid DB query on every request
		$cached = get_transient( 'yayboost_migration_check' );
		if ( $cached === 'no' ) {
			return false;
		}

		$installed_version = get_option( self::DB_VERSION_OPTION, '0.0.0' );
		$needs             = version_compare( $installed_version, self::CURRENT_VERSION, '<' );

		// Cache the result for 1 hour if no migration needed
		if ( ! $needs ) {
			set_transient( 'yayboost_migration_check', 'no', HOUR_IN_SECONDS );
		}

		return $needs;
	}

	/**
	 * Get installed version
	 *
	 * @return string
	 */
	public static function get_installed_version(): string {
		return get_option( self::DB_VERSION_OPTION, '0.0.0' );
	}

	/**
	 * Reset database (for development/testing)
	 *
	 * @return void
	 */
	public static function reset(): void {
		EntityTable::drop();
		LiveVisitorTable::drop();
		FBTRelationshipTable::drop();
		FBTProductStatsTable::drop();
		delete_option( self::DB_VERSION_OPTION );
		delete_transient( 'yayboost_migration_check' );
	}
}
