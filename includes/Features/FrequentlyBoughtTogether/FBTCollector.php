<?php
/**
 * FBT Collector
 *
 * Processes completed orders to collect product relationship data.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Collects FBT data from orders
 */
class FBTCollector {
    /**
     * Cache manager instance
     *
     * @var FBTCacheManager
     */
    private $cache_manager;

    const ORDER_PROCESSED_META_KEY = '_yayboost_fbt_processed';

    /**
     * Constructor
     *
     * @param FBTCacheManager $cache_manager Cache manager instance
     */
    public function __construct( FBTCacheManager $cache_manager ) {
        $this->cache_manager = $cache_manager;
    }

    /**
     * Process a completed order for FBT data
     *
     * @param int $order_id Order ID
     * @return bool True if processed, false if skipped or error
     */
    public function process_order( int $order_id ): bool {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return false;
        }

        // Check if already processed to prevent duplicates
        if ( $this->is_order_processed( $order_id ) ) {
            return false;
        }

        // Get unique parent product IDs from order
        $product_ids = $this->get_parent_product_ids( $order );

        // Need at least 2 products for relationships
        if ( count( $product_ids ) < 2 ) {
            $this->mark_order_processed( $order );
            return true;
        }

        // Update product stats (order count for each product)
        foreach ( $product_ids as $pid ) {
            FBTProductStatsTable::increment_order_count( $pid );
        }

        // Generate and store all product pairs
        $pairs = $this->generate_pairs( $product_ids );
        foreach ( $pairs as $pair ) {
            // Store bidirectional relationships
            FBTRelationshipTable::increment_count( $pair[0], $pair[1] );
            FBTRelationshipTable::increment_count( $pair[1], $pair[0] );
        }

        // Invalidate cache for affected products
        $this->cache_manager->invalidate_products( $product_ids );

        // Mark order as processed
        $this->mark_order_processed( $order );

        return true;
    }

    /**
     * Get unique parent product IDs from order
     *
     * @param \WC_Order $order Order object
     * @return array Array of unique product IDs
     */
    private function get_parent_product_ids( \WC_Order $order ): array {
        $product_ids = [];

        foreach ( $order->get_items() as $item ) {
            $product_id = $item->get_product_id(); // Gets parent ID for variations
            if ( $product_id > 0 ) {
                $product_ids[] = $product_id;
            }
        }

        return array_unique( $product_ids );
    }

    /**
     * Generate all unique pairs from product IDs
     *
     * Example: [1, 2, 3] → [[1, 2], [1, 3], [2, 3]]
     *
     * @param array $product_ids Array of product IDs
     * @return array Array of pairs
     */
    private function generate_pairs( array $product_ids ): array {
        $pairs = [];
        $count = count( $product_ids );

        for ( $i = 0; $i < $count - 1; $i++ ) {
            for ( $j = $i + 1; $j < $count; $j++ ) {
                $pairs[] = [ $product_ids[ $i ], $product_ids[ $j ] ];
            }
        }

        return $pairs;
    }

    /**
     * Mark order as processed
     *
     * @param \WC_Order $order Order object
     * @return void
     */
    private function mark_order_processed( \WC_Order $order ): void {
        $order->update_meta_data( self::ORDER_PROCESSED_META_KEY, time() );
        $order->save();
    }

    /**
     * Check if order is already processed
     *
     * @param int $order_id Order ID
     * @return bool
     */
    public function is_order_processed( int $order_id ): bool {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return false;
        }
        return (bool) $order->get_meta( self::ORDER_PROCESSED_META_KEY );
    }
}
