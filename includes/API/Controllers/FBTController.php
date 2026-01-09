<?php
/**
 * FBT REST API Controller
 *
 * Handles FBT backfill-related API endpoints.
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;
use YayBoost\Features\FrequentlyBoughtTogether\FBTBackfill;
use YayBoost\Features\FrequentlyBoughtTogether\FBTCollector;
use YayBoost\Features\FrequentlyBoughtTogether\FBTCacheManager;

/**
 * Handles FBT API endpoints
 */
class FBTController extends BaseController {
    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes(): void {
        // Start backfill - returns total count and initializes
        $this->register_route(
            '/fbt/backfill/start',
            WP_REST_Server::CREATABLE,
            [ $this, 'start_backfill' ]
        );

        // Process a batch of orders
        $this->register_route(
            '/fbt/backfill/process',
            WP_REST_Server::CREATABLE,
            [ $this, 'process_batch' ]
        );

        // Get current backfill status
        $this->register_route(
            '/fbt/backfill/status',
            WP_REST_Server::READABLE,
            [ $this, 'get_status' ]
        );
    }

    /**
     * Get FBTBackfill instance
     *
     * @return FBTBackfill
     */
    private function get_backfill_instance(): FBTBackfill {
        $cache_manager = new FBTCacheManager();
        $collector     = new FBTCollector( $cache_manager );
        return new FBTBackfill( $collector );
    }

    /**
     * Start backfill process
     *
     * Returns total unprocessed orders count and initializes the process.
     *
     * @param WP_REST_Request $request Request object
     * @return \WP_REST_Response|\WP_Error
     */
    public function start_backfill( WP_REST_Request $request ) {
        try {
            $backfill = $this->get_backfill_instance();

            // Get counts
            $unprocessed = $backfill->count_unprocessed_orders();
            $total       = wc_orders_count( 'completed' );

            // Get batch size from request (default 100)
            $batch_size = $request->get_param( 'batch_size' );
            $batch_size = $batch_size ? absint( $batch_size ) : 100;
            $batch_size = max( 10, min( 500, $batch_size ) ); // Clamp between 10-500

            // Calculate number of batches
            $batches_count = $unprocessed > 0 ? ceil( $unprocessed / $batch_size ) : 0;

            // Reset and update status
            $backfill->reset_status();
            $backfill->update_status(
                [
                    'is_running'    => true,
                    'total'         => $unprocessed,
                    'processed'     => 0,
                    'remaining'     => $unprocessed,
                    'last_order_id' => 0,
                    'started_at'    => current_time( 'mysql' ),
                ]
            );

            return $this->success(
                [
                    'total'             => $unprocessed,
                    'total_orders'      => $total,
                    'already_processed' => max( 0, $total - $unprocessed ),
                    'batch_size'        => $batch_size,
                    'batches_count'     => $batches_count,
                ]
            );
        } catch ( \Exception $e ) {
            return $this->error(
                __( 'Failed to start backfill process.', 'yayboost' ),
                500,
                [ 'error' => $e->getMessage() ]
            );
        }
    }

    /**
     * Process a batch of orders
     *
     * @param WP_REST_Request $request Request object
     * @return \WP_REST_Response|\WP_Error
     */
    public function process_batch( WP_REST_Request $request ) {
        try {
            $backfill = $this->get_backfill_instance();

            // Get parameters
            $batch_size    = $request->get_param( 'batch_size' );
            $last_order_id = $request->get_param( 'last_order_id' );

            $batch_size    = $batch_size ? absint( $batch_size ) : 100;
            $batch_size    = max( 10, min( 500, $batch_size ) ); // Clamp between 10-500
            $last_order_id = $last_order_id ? absint( $last_order_id ) : 0;

            // Process batch
            $result = $backfill->process_batch( $batch_size, $last_order_id );

            // Update running status if completed
            if ( $result['completed'] ) {
                $backfill->update_status(
                    [
                        'is_running'   => false,
                        'completed_at' => current_time( 'mysql' ),
                    ]
                );
            }

            return $this->success(
                [
                    'processed'     => $result['processed'],
                    'last_order_id' => $result['last_order_id'],
                    'remaining'     => $result['remaining'],
                    'completed'     => $result['completed'],
                    'errors'        => $result['errors'] ?? 0,
                ]
            );
        } catch ( \Exception $e ) {
            return $this->error(
                __( 'Failed to process batch.', 'yayboost' ),
                500,
                [ 'error' => $e->getMessage() ]
            );
        }
    }

    /**
     * Get current backfill status
     *
     * @param WP_REST_Request $request Request object
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_status( WP_REST_Request $request ) {
        try {
            $backfill = $this->get_backfill_instance();

            $status      = $backfill->get_status();
            $unprocessed = $backfill->count_unprocessed_orders();
            $total       = wc_orders_count( 'completed' );

            return $this->success(
                [
                    'total'             => $total,
                    'unprocessed'       => $unprocessed,
                    'already_processed' => max( 0, $total - $unprocessed ),
                    'last_order_id'     => $status['last_order_id'] ?? 0,
                    'is_running'        => $status['is_running'] ?? false,
                    'last_run'          => $status['last_run'] ?? null,
                ]
            );
        } catch ( \Exception $e ) {
            return $this->error(
                __( 'Failed to get backfill status.', 'yayboost' ),
                500,
                [ 'error' => $e->getMessage() ]
            );
        }
    }
}
