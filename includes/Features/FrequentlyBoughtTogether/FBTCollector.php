<?php
/**
 * FBT Collector
 *
 * Collects product pairs from completed orders and updates the FBT relationship table.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Database\FBTRelationshipTable;
use YayBoost\Database\FBTProductStatsTable;

/**
 * Handles FBT data collection from completed orders
 */
class FBTCollector {
    /**
     * Order meta key for tracking processed orders
     */
    const PROCESSED_META_KEY = '_yayboost_fbt_processed';

    /**
     * Cache manager instance
     *
     * @var FBTCacheManager
     */
    protected FBTCacheManager $cache_manager;

    /**
     * Constructor
     *
     * @param FBTCacheManager $cache_manager Cache manager instance
     */
    public function __construct( FBTCacheManager $cache_manager ) {
        $this->cache_manager = $cache_manager;
    }

    /**
     * Handle order thank you page (primary handler)
     *
     * @param int $order_id Order ID
     * @return void
     */
    public function handle_order_thankyou( int $order_id ): void {

        // Process order synchronously (user already completed checkout)
        $this->process_order( $order_id );
    }

    /**
     * Handle order completed hook (backup handler)
     *
     * @param int $order_id Order ID
     * @return void
     */
    public function handle_order_completed( int $order_id ): void {
        // Check if already processed (by thank you page)
        if ( $this->is_order_processed( $order_id ) ) {
            return;
        }

        // Process order asynchronously to avoid blocking checkout
        wp_schedule_single_event(
            time() + 5,
            'yayboost_process_fbt_order',
            [ $order_id ]
        );
    }

    /**
     * Background job handler for processing orders
     *
     * @param int $order_id Order ID
     * @return void
     */
    public function handle_background_job( int $order_id ): void {
        $this->process_order( $order_id );
    }

    /**
     * Process order and update FBT relationships
     *
     * @param int $order_id Order ID
     * @return void
     */
    public function process_order( int $order_id ): void {
        // Validate order exists
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        // Check if already processed (pass order object to reuse)
        if ( $this->is_order_processed( $order ) ) {
            return;
        }

        // Extract product IDs from order
        $product_ids = $this->extract_product_ids( $order );
        if ( empty( $product_ids ) ) {
            $this->mark_order_processed( $order );
            return;
        }

        // Always increment product order counts (for accurate threshold calculation)
        $this->increment_product_order_counts_batch( $product_ids );

        // Generate and store pairs only if >= 2 products
        if ( count( $product_ids ) >= 2 ) {
            $pairs = $this->generate_pairs( $product_ids );
            if ( ! empty( $pairs ) ) {
                $this->increment_pairs_batch( $pairs );
            }
        }

        // Invalidate cache for related products using cache manager
        $this->cache_manager->invalidate_products( $product_ids, false );

        // Mark order as processed
        $this->mark_order_processed( $order );
    }

    /**
     * Process multiple orders in batch (optimized for backfill)
     *
     * Collects pairs from all orders first, then performs batch insert.
     * This is more efficient than calling process_order() multiple times.
     *
     * @param array $order_ids Array of order IDs to process.
     * @return array Result with 'processed' count and 'pairs' count.
     */
    public function process_orders_batch( array $order_ids ): array {
        if ( empty( $order_ids ) ) {
            return [
                'processed' => 0,
                'pairs'     => 0,
            ];
        }

        $all_pairs       = [];
        $all_product_ids = [];
        $processed_count = 0;

        foreach ( $order_ids as $order_id ) {
            try {
                $order = \wc_get_order( $order_id );

                if ( ! $order ) {
                    continue;
                }

                // Skip if already processed.
                if ( $this->is_order_processed( $order ) ) {
                    continue;
                }

                // Extract product IDs.
                $product_ids = $this->extract_product_ids( $order );

                if ( ! empty( $product_ids ) ) {
                    // Track all product IDs for order count increment
                    $all_product_ids = array_merge( $all_product_ids, $product_ids );

                    // Generate pairs only if >= 2 products
                    if ( count( $product_ids ) >= 2 ) {
                        $pairs = $this->generate_pairs( $product_ids );
                        if ( ! empty( $pairs ) ) {
                            $all_pairs = array_merge( $all_pairs, $pairs );
                        }
                    }
                }

                // Mark order as processed.
                $this->mark_order_processed( $order );

                ++$processed_count;
            } catch ( \Exception $e ) {
                // Log error but continue with next order.
                error_log(
                    sprintf(
                        'FBT Collector: Error processing order #%d: %s',
                        $order_id,
                        $e->getMessage()
                    )
                );
            }//end try
        }//end foreach

        // Batch increment product order counts
        if ( ! empty( $all_product_ids ) ) {
            try {
                $this->increment_product_order_counts_batch( $all_product_ids );
            } catch ( \Exception $e ) {
                error_log( 'FBT Collector: Error incrementing product counts: ' . $e->getMessage() );
            }
        }

        // Batch insert all pairs at once
        if ( ! empty( $all_pairs ) ) {
            try {
                $this->increment_pairs_batch( $all_pairs );
            } catch ( \Exception $e ) {
                error_log( 'FBT Collector: Error inserting pairs: ' . $e->getMessage() );
            }
        }

        // Invalidate cache for affected products (dedupe first).
        // Use skip_transients=true for performance during backfill.
        if ( ! empty( $all_product_ids ) ) {
            try {
                $unique_product_ids = array_unique( $all_product_ids );
                $this->cache_manager->invalidate_products( $unique_product_ids, true );
            } catch ( \Exception $e ) {
                error_log( 'FBT Collector: Error invalidating cache: ' . $e->getMessage() );
            }
        }

        return [
            'processed' => $processed_count,
            'pairs'     => count( $all_pairs ),
        ];
    }

    /**
     * Check if order has been processed
     *
     * @param int|\WC_Order $order Order ID or WC_Order object
     * @return bool
     */
    public function is_order_processed( $order ): bool {
        if ( is_int( $order ) ) {
            $order = wc_get_order( $order );
        }

        if ( ! $order ) {
            return false;
        }

        return (bool) $order->get_meta( self::PROCESSED_META_KEY, true );
    }

    /**
     * Mark order as processed
     *
     * @param int|\WC_Order $order Order ID or WC_Order object
     * @return void
     */
    public function mark_order_processed( $order ): void {
        if ( is_int( $order ) ) {
            $order = wc_get_order( $order );
        }

        if ( ! $order ) {
            return;
        }

        $order->update_meta_data( self::PROCESSED_META_KEY, true );
        $order->save();
    }

    /**
     * Extract product IDs from order
     *
     * Only extracts parent product IDs (not variations) to create cleaner
     * FBT relationships. Variations of the same product should not appear
     * as "bought together" suggestions.
     *
     * @param \WC_Order $order WooCommerce order object
     * @return array Array of unique parent product IDs
     */
    public function extract_product_ids( \WC_Order $order ): array {
        $product_ids = [];

        foreach ( $order->get_items() as $item ) {
            // Always use parent product ID (handles both simple and variable products)
            $product_id = $item->get_product_id();
            if ( $product_id ) {
                $product_ids[] = $product_id;
            }

        }

        // Remove duplicates and return
        return array_unique( array_filter( $product_ids ) );
    }

    /**
     * Generate normalized pairs from product IDs
     *
     * Normalizes pairs so (A, B) = (B, A) by always storing
     * smaller ID as product_a and larger ID as product_b
     *
     * @param array $product_ids Array of product IDs
     * @return array Array of pairs [product_a, product_b]
     */
    public function generate_pairs( array $product_ids ): array {
        $pairs = [];
        $count = count( $product_ids );

        // Generate all unique pairs
        for ( $i = 0; $i < $count - 1; $i++ ) {
            for ( $j = $i + 1; $j < $count; $j++ ) {
                $id1 = (int) $product_ids[ $i ];
                $id2 = (int) $product_ids[ $j ];

                // Skip if same product
                if ( $id1 === $id2 ) {
                    continue;
                }

                // Normalize: always store smaller ID as product_a
                $pairs[] = [
                    min( $id1, $id2 ),
                    max( $id1, $id2 ),
                ];
            }
        }

        return $pairs;
    }

    /**
     * Batch UPSERT pairs into database
     *
     * Uses INSERT ... ON DUPLICATE KEY UPDATE for atomic operations
     *
     * @param array $pairs Array of pairs [product_a, product_b]
     * @return void
     */
    public function increment_pairs_batch( array $pairs ): void {
        if ( empty( $pairs ) ) {
            return;
        }

        global $wpdb;
        $table_name = FBTRelationshipTable::get_table_name();

        // Build values for batch insert
        $values = [];
        foreach ( $pairs as $pair ) {
            $product_a = (int) $pair[0];
            $product_b = (int) $pair[1];
            $values[]  = $wpdb->prepare( '(%d, %d, 1, NOW())', $product_a, $product_b );
        }

        // Build SQL query
        $values_str = implode( ', ', $values );
        $sql        = "INSERT INTO {$table_name} (product_a, product_b, count, last_updated) VALUES {$values_str}
            ON DUPLICATE KEY UPDATE 
            count = count + 1,
            last_updated = NOW()";

        // Execute query
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $wpdb->query( $sql );
    }

    /**
     * Batch increment product order counts
     *
     * Tracks how many orders contain each product for accurate threshold calculation.
     * Uses INSERT ... ON DUPLICATE KEY UPDATE for atomic operations.
     *
     * @param array $product_ids Array of product IDs (can contain duplicates from same order).
     * @return void
     */
    public function increment_product_order_counts_batch( array $product_ids ): void {
        if ( empty( $product_ids ) ) {
            return;
        }

        // Dedupe and count occurrences per product in this batch
        $counts = array_count_values( array_map( 'intval', $product_ids ) );

        global $wpdb;
        $table_name = FBTProductStatsTable::get_table_name();

        // Build values for batch insert
        $values = [];
        foreach ( $counts as $product_id => $count ) {
            $values[] = $wpdb->prepare( '(%d, %d, NOW())', $product_id, $count );
        }

        // Build SQL query with UPSERT
        $values_str = implode( ', ', $values );
        $sql        = "INSERT INTO {$table_name} (product_id, order_count, last_updated) VALUES {$values_str}
            ON DUPLICATE KEY UPDATE
            order_count = order_count + VALUES(order_count),
            last_updated = NOW()";

        // Execute query
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $wpdb->query( $sql );
    }
}
