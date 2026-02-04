<?php
/**
 * FBT Backfill Cron Handler
 *
 * Handles automatic background processing of FBT backfill on plugin activation.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\API\Controllers\DashboardController;

defined( 'ABSPATH' ) || exit;

/**
 * Handles background FBT backfill via WP-Cron
 */
class FBTBackfillCron {
    /**
     * Cron hook name
     */
    const CRON_HOOK = 'yayboost_fbt_auto_backfill';

    /**
     * Batch size for processing
     */
    const BATCH_SIZE = 50;

    /**
     * Delay between batches in seconds
     */
    const BATCH_DELAY = 5;

    /**
     * Register cron hooks
     */
    public static function register(): void {
        add_action( self::CRON_HOOK, [ self::class, 'process_batch' ] );
    }

    /**
     * Schedule the backfill to run
     * Called on plugin activation
     */
    public static function schedule(): void {
        // Skip if already completed
        if ( get_option( DashboardController::FBT_BACKFILL_OPTION, false ) ) {
            return;
        }

        // Skip if already scheduled
        if ( wp_next_scheduled( self::CRON_HOOK ) ) {
            return;
        }

        wp_schedule_single_event( time(), self::CRON_HOOK );
    }

    /**
     * Unschedule the backfill
     * Called on plugin deactivation
     */
    public static function unschedule(): void {
        $timestamp = wp_next_scheduled( self::CRON_HOOK );
        if ( $timestamp ) {
            wp_unschedule_event( $timestamp, self::CRON_HOOK );
        }
    }

    /**
     * Process a batch of orders
     */
    public static function process_batch(): void {
        // Get last processed order ID from status
        $cache_manager = new FBTCacheManager();
        $collector     = new FBTCollector( $cache_manager );
        $backfill      = new FBTBackfill( $collector );

        $status        = $backfill->get_status();
        $last_order_id = $status['last_order_id'] ?? 0;

        // Process batch
        $result = $backfill->process_batch( self::BATCH_SIZE, $last_order_id );

        if ( $result['completed'] ) {
            // Mark as completed
            update_option( DashboardController::FBT_BACKFILL_OPTION, true );
            $backfill->update_status( [ 'completed_at' => current_time( 'mysql' ) ] );
        } else {
            // Schedule next batch
            wp_schedule_single_event( time() + self::BATCH_DELAY, self::CRON_HOOK );
        }
    }
}
