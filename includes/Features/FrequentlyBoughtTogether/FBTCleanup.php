<?php
/**
 * FBT Cleanup
 *
 * Handles cleanup of old and low-count FBT relationship data.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Database\FBTRelationshipTable;

/**
 * Handles FBT data cleanup
 */
class FBTCleanup {
    /**
     * Feature instance
     *
     * @var FrequentlyBoughtTogetherFeature
     */
    protected $feature;

    /**
     * Batch size for cleanup operations
     */
    const BATCH_SIZE = 1000;

    public function __construct( FrequentlyBoughtTogetherFeature $feature ) {
        $this->feature = $feature;

        // Register cleanup cron job
        if ( ! wp_next_scheduled( 'yayboost_fbt_weekly_cleanup' ) ) {
            wp_schedule_event( time(), 'weekly', 'yayboost_fbt_weekly_cleanup' );
        }
        add_action( 'yayboost_fbt_weekly_cleanup', [ $this, 'run_cleanup' ] );
    }

    /**
     * Run cleanup tasks
     *
     * @return void
     */
    public function run_cleanup(): void {

        if ( ! $this->feature->is_enabled() ) {
            return;
        }

        $settings = $this->feature->get_settings();

        $stats = [
            'low_count_deleted' => 0,
            'orphaned_deleted'  => 0,
            'old_deleted'       => 0,
        ];

        // Delete low count pairs
        $threshold                  = isset( $settings['min_order_threshold'] ) ? (float) $settings['min_order_threshold'] : 5;
        $stats['low_count_deleted'] = $this->delete_low_count_pairs( $threshold );

        // Delete orphaned pairs (products that no longer exist)
        $stats['orphaned_deleted'] = $this->delete_orphaned_pairs();

        // Delete old pairs (older than 1 year)
        $stats['old_deleted'] = $this->delete_old_pairs();

        // Optimize table
        $this->optimize_table();

        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( sprintf( 'YayBoost FBT Cleanup: %d low count deleted, %d orphaned deleted, %d old deleted', $stats['low_count_deleted'], $stats['orphaned_deleted'], $stats['old_deleted'] ) );
        }
    }

    /**
     * Delete pairs with very low count (noise removal)
     *
     * Uses absolute minimum count instead of percentage-based threshold.
     * Percentage-based filtering is handled dynamically by FBTRepository
     * at query time, which correctly applies threshold per-product.
     *
     * @param float $threshold Unused - kept for API compatibility.
     * @return int Number of deleted rows
     */
    protected function delete_low_count_pairs( float $threshold ): int {
        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        // Use absolute minimum count (pairs bought together only once are noise)
        $min_count = 2;

        // Delete in batches
        $deleted = 0;
        do {
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $result   = $wpdb->query(
                $wpdb->prepare(
                    "DELETE FROM {$table_name} WHERE count < %d LIMIT %d",
                    $min_count,
                    self::BATCH_SIZE
                )
            );
            $deleted += $result;
        } while ( $result > 0 );

        return $deleted;
    }

    /**
     * Delete pairs where products no longer exist
     *
     * Uses batched processing to prevent memory exhaustion on large stores.
     *
     * @return int Number of deleted rows
     */
    protected function delete_orphaned_pairs(): int {
        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        $deleted = 0;
        $offset  = 0;

        // Process product IDs in batches to prevent memory exhaustion
        do {
            // Get batch of distinct product IDs from relationships
            // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
            $product_ids = $wpdb->get_col(
                $wpdb->prepare(
                    "SELECT DISTINCT product_id FROM (
                        SELECT product_a AS product_id FROM {$table_name}
                        UNION
                        SELECT product_b AS product_id FROM {$table_name}
                    ) AS all_products
                    LIMIT %d OFFSET %d",
                    self::BATCH_SIZE,
                    $offset
                )
            );

            if ( empty( $product_ids ) ) {
                break;
            }

            $product_ids = array_map( 'intval', $product_ids );

            // Check which products exist using WooCommerce API (handles HPOS)
            $existing_ids = wc_get_products(
                [
                    'include' => $product_ids,
                    'limit'   => -1,
                    'return'  => 'ids',
                ]
            );

            $existing_ids = array_map( 'intval', $existing_ids );
            $missing_ids  = array_diff( $product_ids, $existing_ids );

            // Delete pairs with missing products
            if ( ! empty( $missing_ids ) ) {
                $placeholders = implode( ',', array_fill( 0, count( $missing_ids ), '%d' ) );
                // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
                $result   = $wpdb->query(
                    $wpdb->prepare(
                        "DELETE FROM {$table_name}
                        WHERE product_a IN ({$placeholders}) OR product_b IN ({$placeholders})",
                        array_merge( $missing_ids, $missing_ids )
                    )
                );
                $deleted += (int) $result;
            }

            $offset += self::BATCH_SIZE;

        } while ( count( $product_ids ) === self::BATCH_SIZE );

        return $deleted;
    }

    /**
     * Delete pairs older than 1 year
     *
     * @return int Number of deleted rows
     */
    protected function delete_old_pairs(): int {
        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        $one_year_ago = gmdate( 'Y-m-d H:i:s', strtotime( '-1 year' ) );

        // Delete in batches
        $deleted = 0;
        do {
            $result   = $wpdb->query(
                $wpdb->prepare(
                    "DELETE FROM {$table_name} 
                    WHERE last_updated < %s 
                    LIMIT %d",
                    $one_year_ago,
                    self::BATCH_SIZE
                )
            );
            $deleted += $result;
        } while ( $result > 0 );

        return $deleted;
    }

    /**
     * Optimize the FBT relationships table
     *
     * @return void
     */
    protected function optimize_table(): void {
        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
        $wpdb->query( "OPTIMIZE TABLE {$table_name}" );
    }
}
