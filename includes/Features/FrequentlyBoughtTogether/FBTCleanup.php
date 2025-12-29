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
     * Batch size for cleanup operations
     */
    const BATCH_SIZE = 1000;

    /**
     * Run cleanup tasks
     *
     * @param array $settings Feature settings
     * @return array Cleanup statistics
     */
    public function run_cleanup( array $settings = [] ): array {
        $stats = [
            'low_count_deleted' => 0,
            'orphaned_deleted'  => 0,
            'old_deleted'       => 0,
        ];

        // Delete low count pairs
        $threshold = isset( $settings['min_order_threshold'] ) ? (float) $settings['min_order_threshold'] : 5;
        $stats['low_count_deleted'] = $this->delete_low_count_pairs( $threshold );

        // Delete orphaned pairs (products that no longer exist)
        $stats['orphaned_deleted'] = $this->delete_orphaned_pairs();

        // Delete old pairs (older than 1 year)
        $stats['old_deleted'] = $this->delete_old_pairs();

        // Optimize table
        $this->optimize_table();

        return $stats;
    }

    /**
     * Delete pairs with count below threshold
     *
     * @param float $threshold Minimum threshold percentage
     * @return int Number of deleted rows
     */
    protected function delete_low_count_pairs( float $threshold ): int {
        if ( $threshold <= 0 ) {
            return 0;
        }

        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        // Get total orders count
        $repository = new FBTRepository();
        $total_orders = $repository->get_total_orders_count();

        if ( $total_orders <= 0 ) {
            return 0;
        }

        // Calculate minimum count
        $min_count = ceil( ( $threshold / 100 ) * $total_orders );

        // Delete in batches
        $deleted = 0;
        do {
            $result = $wpdb->query(
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
     * @return int Number of deleted rows
     */
    protected function delete_orphaned_pairs(): int {
        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        // Get all product IDs from relationships
        $product_ids = $wpdb->get_col(
            "SELECT DISTINCT product_a FROM {$table_name}
            UNION
            SELECT DISTINCT product_b FROM {$table_name}"
        );

        if ( empty( $product_ids ) ) {
            return 0;
        }

        // Check which products exist
        $existing_ids = get_posts(
            [
                'post_type'      => 'product',
                'post__in'       => $product_ids,
                'posts_per_page' => -1,
                'fields'         => 'ids',
            ]
        );

        $existing_ids = array_map( 'intval', $existing_ids );
        $missing_ids   = array_diff( $product_ids, $existing_ids );

        if ( empty( $missing_ids ) ) {
            return 0;
        }

        // Delete pairs with missing products
        $placeholders = implode( ',', array_fill( 0, count( $missing_ids ), '%d' ) );
        $deleted      = $wpdb->query(
            $wpdb->prepare(
                "DELETE FROM {$table_name} 
                WHERE product_a IN ({$placeholders}) OR product_b IN ({$placeholders})",
                array_merge( $missing_ids, $missing_ids )
            )
        );

        return (int) $deleted;
    }

    /**
     * Delete pairs older than 1 year
     *
     * @return int Number of deleted rows
     */
    protected function delete_old_pairs(): int {
        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        $one_year_ago = date( 'Y-m-d H:i:s', strtotime( '-1 year' ) );

        // Delete in batches
        $deleted = 0;
        do {
            $result = $wpdb->query(
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

