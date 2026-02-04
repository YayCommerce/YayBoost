<?php
/**
 * FBT Backfill
 *
 * Batch processes historical orders to build FBT relationship data.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Handles backfill of historical orders for FBT data
 */
class FBTBackfill {
    /**
     * Option name for backfill status
     */
    const STATUS_OPTION = 'yayboost_fbt_backfill_status';

    /**
     * Collector instance
     *
     * @var FBTCollector
     */
    private $collector;

    /**
     * Constructor
     *
     * @param FBTCollector $collector Collector instance
     */
    public function __construct( FBTCollector $collector ) {
        $this->collector = $collector;
    }

    /**
     * Count unprocessed orders
     *
     * @return int
     */
    public function count_unprocessed_orders(): int {
        global $wpdb;

        // Count completed orders without FBT processed meta
        $sql = "
            SELECT COUNT(DISTINCT o.id)
            FROM {$wpdb->prefix}wc_orders o
            LEFT JOIN {$wpdb->prefix}wc_orders_meta om
                ON o.id = om.order_id AND om.meta_key = '" . FBTCollector::ORDER_PROCESSED_META_KEY . "'
            WHERE o.status = 'wc-completed'
              AND om.meta_value IS NULL
        ";

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        return (int) $wpdb->get_var( $sql );
    }

    /**
     * Process a batch of historical orders
     *
     * @param int $batch_size    Number of orders to process per batch
     * @param int $last_order_id Last processed order ID (for pagination)
     * @return array Result with processed count, last order ID, remaining, completed flag
     */
    public function process_batch( int $batch_size, int $last_order_id = 0 ): array {
        global $wpdb;

        $sql = $wpdb->prepare(
            "
                SELECT DISTINCT o.id
                FROM {$wpdb->prefix}wc_orders o
                LEFT JOIN {$wpdb->prefix}wc_orders_meta om
                    ON o.id = om.order_id AND om.meta_key = %s
                WHERE o.status = 'wc-completed'
                  AND om.meta_value IS NULL
                  AND o.id > %d
                ORDER BY o.id ASC
                LIMIT %d
            ",
            FBTCollector::ORDER_PROCESSED_META_KEY,
            $last_order_id,
            $batch_size
        );

        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $order_ids = $wpdb->get_col( $sql );

        $processed   = 0;
        $errors      = 0;
        $new_last_id = $last_order_id;

        foreach ( $order_ids as $order_id ) {
            try {
                $this->collector->process_order( (int) $order_id );
                ++$processed;
                $new_last_id = (int) $order_id;
            } catch ( \Exception $e ) {
                ++$errors;
                if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
                    error_log( 'FBT Backfill Error for order ' . $order_id . ': ' . $e->getMessage() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
                }
            }
        }

        // Count remaining
        $remaining = $this->count_unprocessed_orders();
        $completed = $remaining === 0;

        // Update status
        $this->update_status(
            [
                'last_order_id' => $new_last_id,
                'processed'     => $processed,
                'remaining'     => $remaining,
                'errors'        => $errors,
                'last_run'      => current_time( 'mysql' ),
            ]
        );

        return [
            'processed'     => $processed,
            'last_order_id' => $new_last_id,
            'remaining'     => $remaining,
            'completed'     => $completed,
            'errors'        => $errors,
        ];
    }

    /**
     * Get current backfill status
     *
     * @return array
     */
    public function get_status(): array {
        $default = [
            'is_running'    => false,
            'total'         => 0,
            'processed'     => 0,
            'remaining'     => 0,
            'last_order_id' => 0,
            'errors'        => 0,
            'started_at'    => null,
            'completed_at'  => null,
            'last_run'      => null,
        ];

        $status = get_option( self::STATUS_OPTION, [] );
        return array_merge( $default, $status );
    }

    /**
     * Update backfill status
     *
     * @param array $data Status data to merge
     * @return bool
     */
    public function update_status( array $data ): bool {
        $current = $this->get_status();
        $updated = array_merge( $current, $data );
        return update_option( self::STATUS_OPTION, $updated );
    }

    /**
     * Reset backfill status
     *
     * @return bool
     */
    public function reset_status(): bool {
        return delete_option( self::STATUS_OPTION );
    }
}
