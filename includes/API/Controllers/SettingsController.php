<?php
/**
 * Settings REST API Controller
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;

/**
 * Handles settings-related API endpoints
 */
class SettingsController extends BaseController {
    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes() {
        // Get settings
        $this->register_route( '/settings', WP_REST_Server::READABLE, [ $this, 'get_settings' ] );

        // Update settings
        $this->register_route( '/settings', WP_REST_Server::EDITABLE, [ $this, 'update_settings' ] );
    }

    /**
     * Get settings
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_settings($request) {
        $settings = $this->container->resolve( 'settings' );

        return $this->success( $settings->get_all() );
    }

    /**
     * Update settings
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function update_settings($request) {
        $data     = $request->get_json_params();
        $settings = $this->container->resolve( 'settings' );

        $settings->update( $data );

        return $this->success(
            [
                'message' => __( 'Settings updated successfully.', 'yayboost' ),
                'data'    => $settings->get_all(),
            ]
        );
    }
}
