<?php
/**
 * Feature REST API Controller
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;

/**
 * Handles feature-related API endpoints
 */
class AdminController extends BaseController {
    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes(): void {
        // Get all features
        $this->register_route( '/admin/mark-reviewed', 'POST', [ $this, 'mark_reviewed' ] );
    }

    public function mark_reviewed(WP_REST_Request $request) {
        update_option( 'yayboost_has_reviewed', true );
        return $this->success( [ 'message' => __( 'Reviewed marked successfully.', 'yayboost-sales-booster-for-woocommerce' ) ] );
    }
}
