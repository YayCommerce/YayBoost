<?php
/**
 * Analytics Aggregator
 *
 * Handles daily aggregation of events and cleanup of old data.
 * Runs via WP-Cron.
 *
 * @package YayBoost
 */

namespace YayBoost\Analytics;

defined( 'ABSPATH' ) || exit;
/**
 * Aggregates and cleans up analytics data
 */
class AnalyticsAggregator {
    /**
     * Cron hook name for aggregation
     */
    const CRON_HOOK_AGGREGATE = 'yayboost_analytics_aggregate';

    /**
     * Cron hook name for cleanup
     */
    const CRON_HOOK_CLEANUP = 'yayboost_analytics_cleanup';

    /**
     * Default retention days for raw events
     */
    const DEFAULT_RETENTION_DAYS = 30;

    /**
     * Default batch size for cleanup
     */
    const DEFAULT_BATCH_SIZE = 10000;

    /**
     * Register cron hooks
     *
     * @return void
     */
    public static function register(): void {
        add_action( self::CRON_HOOK_AGGREGATE, [ self::class, 'run_aggregation' ] );
        add_action( self::CRON_HOOK_CLEANUP, [ self::class, 'run_cleanup' ] );
    }

    /**
     * Schedule cron jobs (call on plugin activation)
     *
     * @return void
     */
    public static function schedule(): void {
        // Schedule daily aggregation at 2 AM
        if ( ! wp_next_scheduled( self::CRON_HOOK_AGGREGATE ) ) {
            wp_schedule_event(
                strtotime( 'tomorrow 2:00am' ),
                'daily',
                self::CRON_HOOK_AGGREGATE
            );
        }

        // Schedule daily cleanup at 3 AM
        if ( ! wp_next_scheduled( self::CRON_HOOK_CLEANUP ) ) {
            wp_schedule_event(
                strtotime( 'tomorrow 3:00am' ),
                'daily',
                self::CRON_HOOK_CLEANUP
            );
        }
    }

    /**
     * Unschedule cron jobs (call on plugin deactivation)
     *
     * @return void
     */
    public static function unschedule(): void {
        wp_clear_scheduled_hook( self::CRON_HOOK_AGGREGATE );
        wp_clear_scheduled_hook( self::CRON_HOOK_CLEANUP );
    }

    /**
     * Run aggregation for yesterday's data
     *
     * This consolidates raw events into daily aggregates.
     * Called by cron job.
     *
     * @return array Results summary
     */
    public static function run_aggregation(): array {
        $yesterday = gmdate( 'Y-m-d', strtotime( '-1 day' ) );
        return self::aggregate_date( $yesterday );
    }

    /**
     * Aggregate events for a specific date
     *
     * @param string $date Date in Y-m-d format
     * @return array Results summary
     */
    public static function aggregate_date( string $date ): array {
        $events  = AnalyticsEventsTable::get_events_for_date( $date );
        $results = [
            'date'     => $date,
            'features' => [],
        ];

        // Group events by feature
        $by_feature = [];
        foreach ( $events as $event ) {
            $feature_id = $event['feature_id'];
            if ( ! isset( $by_feature[ $feature_id ] ) ) {
                $by_feature[ $feature_id ] = [
                    'impressions'     => 0,
                    'clicks'          => 0,
                    'add_to_carts'    => 0,
                    'purchases'       => 0,
                    'revenue'         => 0,
                    'unique_products' => 0,
                ];
            }

            $stat_map = [
                'impression'  => 'impressions',
                'click'       => 'clicks',
                'add_to_cart' => 'add_to_carts',
                'purchase'    => 'purchases',
            ];

            $event_type = $event['event_type'];
            if ( isset( $stat_map[ $event_type ] ) ) {
                $stat_name                                = $stat_map[ $event_type ];
                $by_feature[ $feature_id ][ $stat_name ] += (int) $event['event_count'];

                if ( 'purchase' === $event_type ) {
                    $by_feature[ $feature_id ]['revenue'] += (float) $event['total_revenue'];
                }

                // Track unique products (max across event types)
                $unique = (int) $event['unique_products'];
                if ( $unique > $by_feature[ $feature_id ]['unique_products'] ) {
                    $by_feature[ $feature_id ]['unique_products'] = $unique;
                }
            }
        }//end foreach

        // Upsert aggregates
        foreach ( $by_feature as $feature_id => $stats ) {
            AnalyticsDailyTable::upsert( $feature_id, $date, $stats );
            $results['features'][ $feature_id ] = $stats;
        }

        // Store order-level totals for this date (FBT-only SUM, mixed MAX) in daily table with special feature_id.
        $order_totals = AnalyticsEventsTable::get_purchase_order_totals( $date, $date );
        AnalyticsDailyTable::upsert(
            '_order_totals',
            $date,
            [
                'impressions'     => 0,
                'clicks'          => 0,
                'add_to_carts'    => 0,
                'purchases'       => (int) $order_totals['orders_count'],
                'revenue'         => (float) $order_totals['orders_revenue'],
                'unique_products' => 0,
            ]
        );
        $results['order_totals'] = $order_totals;

        return $results;
    }

    /**
     * Run cleanup of old events
     *
     * Called by cron job.
     *
     * @return array Results summary
     */
    public static function run_cleanup(): array {
        $retention_days = self::get_retention_days();
        $batch_size     = self::get_batch_size();

        $deleted = AnalyticsEventsTable::cleanup( $retention_days, $batch_size );

        return [
            'deleted'        => $deleted,
            'retention_days' => $retention_days,
            'batch_size'     => $batch_size,
        ];
    }

    /**
     * Get retention days from settings
     *
     * @return int
     */
    public static function get_retention_days(): int {
        $days = get_option( 'yayboost_analytics_retention_days', self::DEFAULT_RETENTION_DAYS );
        return max( 7, min( 365, (int) $days ) );
        // Clamp between 7-365 days
    }

    /**
     * Get batch size for cleanup
     *
     * @return int
     */
    public static function get_batch_size(): int {
        $size = get_option( 'yayboost_analytics_cleanup_batch', self::DEFAULT_BATCH_SIZE );
        return max( 1000, min( 50000, (int) $size ) );
        // Clamp between 1k-50k
    }

    /**
     * Manually trigger aggregation for a date range
     *
     * Useful for backfilling or re-aggregating.
     *
     * @param string $start_date Start date (Y-m-d)
     * @param string $end_date   End date (Y-m-d)
     * @return array Results for each date
     */
    public static function aggregate_range( string $start_date, string $end_date ): array {
        $results = [];
        $current = strtotime( $start_date );
        $end     = strtotime( $end_date );

        while ( $current <= $end ) {
            $date             = gmdate( 'Y-m-d', $current );
            $results[ $date ] = self::aggregate_date( $date );
            $current          = strtotime( '+1 day', $current );
        }

        return $results;
    }
}
