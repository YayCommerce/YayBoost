<?php
/**
 * FBT Backfill
 *
 * Handles backfilling FBT relationships from historical orders.
 * Uses cursor-based pagination for efficient processing of large order volumes.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Handles FBT backfill processing from historical orders
 */
class FBTBackfill {
    /**
     * FBT Collector instance
     *
     * @var FBTCollector
     */
    private FBTCollector $collector;

    /**
     * Option key for storing backfill status
     */
    const STATUS_OPTION_KEY = 'yayboost_fbt_backfill_status';

    /**
     * Constructor
     *
     * @param FBTCollector $collector FBT Collector instance.
     */
    public function __construct( FBTCollector $collector ) {
        $this->collector = $collector;
    }

    /**
     * Count unprocessed orders (wc-completed without _yayboost_fbt_processed meta)
     *
     * @return int Number of unprocessed orders
     */
    public function count_unprocessed_orders(): int {
        try {
            global $wpdb;

            // Use HPOS-compatible query if available.
            if ( $this->is_hpos_enabled() ) {
                return $this->count_unprocessed_orders_hpos();
            }

            // Legacy post-based orders.
            $meta_key = FBTCollector::PROCESSED_META_KEY;

            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $count = $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(DISTINCT p.ID)
                    FROM {$wpdb->posts} p
                    LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = %s
                    WHERE p.post_type = 'shop_order'
                    AND p.post_status = 'wc-completed'
                    AND pm.meta_value IS NULL",
                    $meta_key
                )
            );

            return (int) $count;
        } catch ( \Exception $e ) {
            error_log( 'FBT Backfill: Error in count_unprocessed_orders: ' . $e->getMessage() );
            return 0;
        }//end try
    }

    /**
     * Count unprocessed orders using HPOS (High-Performance Order Storage)
     *
     * @return int Number of unprocessed orders
     */
    private function count_unprocessed_orders_hpos(): int {
        try {
            global $wpdb;

            $orders_table = $wpdb->prefix . 'wc_orders';
            $meta_table   = $wpdb->prefix . 'wc_orders_meta';
            $meta_key     = FBTCollector::PROCESSED_META_KEY;

            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $count = $wpdb->get_var(
                $wpdb->prepare(
                    "SELECT COUNT(DISTINCT o.id)
                    FROM {$orders_table} o
                    LEFT JOIN {$meta_table} om ON o.id = om.order_id AND om.meta_key = %s
                    WHERE o.type = 'shop_order'
                    AND o.status = 'wc-completed'
                    AND om.meta_value IS NULL",
                    $meta_key
                )
            );

            return (int) $count;
        } catch ( \Exception $e ) {
            error_log( 'FBT Backfill: Error in count_unprocessed_orders_hpos: ' . $e->getMessage() );
            return 0;
        }//end try
    }

    /**
     * Process a batch of orders using cursor-based pagination
     *
     * @param int $batch_size    Number of orders to process per batch.
     * @param int $last_order_id Last processed order ID (cursor).
     * @return array Processing result with stats
     */
    public function process_batch( int $batch_size, int $last_order_id = 0 ): array {
        // Increase execution time for this request to prevent timeout (2 minutes).
        if ( function_exists( 'set_time_limit' ) ) {
            set_time_limit( 120 );
        }

        // Get batch of unprocessed orders.
        $order_ids = $this->get_unprocessed_order_ids( $batch_size, $last_order_id );

        if ( empty( $order_ids ) ) {
            return [
                'processed'     => 0,
                'last_order_id' => $last_order_id,
                'remaining'     => 0,
                'completed'     => true,
                'errors'        => 0,
            ];
        }

        $new_last_order_id = $last_order_id;
        $error_count       = 0;

        // Process orders using batch method from collector.
        try {
            $result          = $this->collector->process_orders_batch( $order_ids );
            $processed_count = $result['processed'] ?? 0;

            // Update cursor to last order ID (even if some failed).
            // This ensures we don't get stuck in infinite loop.
            if ( ! empty( $order_ids ) ) {
                $new_last_order_id = max( $order_ids );
            }

            // Calculate error count: orders that were requested but not processed.
            // Note: This is an estimate since process_orders_batch catches errors internally.
            $requested_count = count( $order_ids );
            $error_count     = max( 0, $requested_count - $processed_count );
        } catch ( \Exception $e ) {
            // If entire batch fails, log and continue.
            error_log( 'FBT Backfill: Error processing batch: ' . $e->getMessage() );
            $processed_count   = 0;
            $error_count       = count( $order_ids );
            $new_last_order_id = ! empty( $order_ids ) ? max( $order_ids ) : $last_order_id;
        }//end try

        // Estimate remaining instead of counting (slow query).
        // Use the status total and subtract processed count.
        $status              = $this->get_status();
        $total_from_status   = $status['total'] ?? 0;
        $prev_processed      = $status['processed'] ?? 0;
        $estimated_remaining = max( 0, $total_from_status - $prev_processed - $processed_count );

        // Update status with cumulative processed count.
        $cumulative_processed = $prev_processed + $processed_count;
        $this->update_status(
            [
                'last_order_id' => $new_last_order_id,
                'processed'     => $cumulative_processed,
                'remaining'     => $estimated_remaining,
                'last_run'      => current_time( 'mysql' ),
            ]
        );

        // Check if completed by checking if we got fewer orders than requested.
        $is_completed = count( $order_ids ) < $batch_size || $estimated_remaining === 0;

        return [
            'processed'     => $processed_count,
            'last_order_id' => $new_last_order_id,
            'remaining'     => $estimated_remaining,
            'completed'     => $is_completed,
            'errors'        => $error_count,
        ];
    }

    /**
     * Get unprocessed order IDs using cursor-based pagination
     *
     * @param int $limit         Number of orders to fetch.
     * @param int $last_order_id Last processed order ID (cursor).
     * @return array Array of order IDs
     */
    private function get_unprocessed_order_ids( int $limit, int $last_order_id = 0 ): array {
        try {
            global $wpdb;

            // Use HPOS-compatible query if available.
            if ( $this->is_hpos_enabled() ) {
                return $this->get_unprocessed_order_ids_hpos( $limit, $last_order_id );
            }

            // Legacy post-based orders.
            $meta_key = FBTCollector::PROCESSED_META_KEY;

            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $order_ids = $wpdb->get_col(
                $wpdb->prepare(
                    "SELECT DISTINCT p.ID
                    FROM {$wpdb->posts} p
                    LEFT JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = %s
                    WHERE p.post_type = 'shop_order'
                    AND p.post_status = 'wc-completed'
                    AND pm.meta_value IS NULL
                    AND p.ID > %d
                    ORDER BY p.ID ASC
                    LIMIT %d",
                    $meta_key,
                    $last_order_id,
                    $limit
                )
            );

            return array_map( 'intval', $order_ids );
        } catch ( \Exception $e ) {
            error_log( 'FBT Backfill: Error in get_unprocessed_order_ids: ' . $e->getMessage() );
            return [];
        }//end try
    }

    /**
     * Get unprocessed order IDs using HPOS
     *
     * @param int $limit         Number of orders to fetch.
     * @param int $last_order_id Last processed order ID (cursor).
     * @return array Array of order IDs
     */
    private function get_unprocessed_order_ids_hpos( int $limit, int $last_order_id = 0 ): array {
        try {
            global $wpdb;

            $orders_table = $wpdb->prefix . 'wc_orders';
            $meta_table   = $wpdb->prefix . 'wc_orders_meta';
            $meta_key     = FBTCollector::PROCESSED_META_KEY;

            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $order_ids = $wpdb->get_col(
                $wpdb->prepare(
                    "SELECT DISTINCT o.id
                    FROM {$orders_table} o
                    LEFT JOIN {$meta_table} om ON o.id = om.order_id AND om.meta_key = %s
                    WHERE o.type = 'shop_order'
                    AND o.status = 'wc-completed'
                    AND om.meta_value IS NULL
                    AND o.id > %d
                    ORDER BY o.id ASC
                    LIMIT %d",
                    $meta_key,
                    $last_order_id,
                    $limit
                )
            );

            return array_map( 'intval', $order_ids );
        } catch ( \Exception $e ) {
            error_log( 'FBT Backfill: Error in get_unprocessed_order_ids_hpos: ' . $e->getMessage() );
            return [];
        }//end try
    }

    /**
     * Check if HPOS (High-Performance Order Storage) is enabled
     *
     * @return bool
     */
    private function is_hpos_enabled(): bool {
        if ( ! class_exists( '\Automattic\WooCommerce\Utilities\OrderUtil' ) ) {
            return false;
        }

        // @phpstan-ignore-next-line
        return \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled();
    }

    /**
     * Get backfill status
     *
     * @return array Status data
     */
    public function get_status(): array {
        $status = get_option( self::STATUS_OPTION_KEY, [] );

        $defaults = [
            'last_order_id' => 0,
            'processed'     => 0,
            'remaining'     => 0,
            'last_run'      => null,
            'is_running'    => false,
        ];

        return wp_parse_args( $status, $defaults );
    }

    /**
     * Update backfill status
     *
     * @param array $status Status data to merge.
     * @return void
     */
    public function update_status( array $status ): void {
        $current = $this->get_status();
        $updated = array_merge( $current, $status );
        update_option( self::STATUS_OPTION_KEY, $updated, false );
    }

    /**
     * Reset backfill status
     *
     * @return void
     */
    public function reset_status(): void {
        delete_option( self::STATUS_OPTION_KEY );
    }

    /**
     * Get total completed orders count
     *
     * @return int
     */
    public function get_total_completed_orders(): int {
        try {
            global $wpdb;

            if ( $this->is_hpos_enabled() ) {
                $orders_table = $wpdb->prefix . 'wc_orders';
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
                $count = $wpdb->get_var(
                    "SELECT COUNT(*) FROM {$orders_table} WHERE type = 'shop_order' AND status = 'wc-completed'"
                );
            } else {
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
                $count = $wpdb->get_var(
                    "SELECT COUNT(*) FROM {$wpdb->posts} WHERE post_type = 'shop_order' AND post_status = 'wc-completed'"
                );
            }

            return (int) $count;
        } catch ( \Exception $e ) {
            error_log( 'FBT Backfill: Error in get_total_completed_orders: ' . $e->getMessage() );
            return 0;
        }//end try
    }
}
