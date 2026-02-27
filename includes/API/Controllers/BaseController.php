<?php
/**
 * Base REST API Controller
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use YayBoost\Container\Container;
use YayBoost\API\Router;
use WP_REST_Request;
use WP_REST_Response;
use WP_Error;

/**
 * Base controller for REST API endpoints
 */
abstract class BaseController {
    /**
     * Container instance
     *
     * @var Container
     */
    protected $container;

    /**
     * Constructor
     *
     * @param Container $container
     */
    public function __construct(Container $container) {
        $this->container = $container;
    }

    /**
     * Register routes
     *
     * @return void
     */
    abstract public function register_routes();

    /**
     * Register a route
     *
     * @param string   $route Route path
     * @param string   $method HTTP method
     * @param callable $callback Callback function
     * @param array    $args Additional arguments
     * @return void
     */
    protected function register_route($route, $method, $callback, $args = []) {
        $defaultArgs = [
            'methods'             => $method,
            'callback'            => $callback,
            'permission_callback' => [ $this, 'check_permission' ],
        ];

        $args = array_merge( $defaultArgs, $args );

        register_rest_route( Router::get_namespace(), $route, $args );
    }

    /**
     * Check if user has permission
     *
     * @param WP_REST_Request $request
     * @return bool|WP_Error
     */
    public function check_permission($request) {
        if ( ! current_user_can( 'manage_woocommerce' )) {
            return new WP_Error(
                'rest_forbidden',
                __( 'You do not have permission to access this resource.', 'yayboost-sales-booster-for-woocommerce' ),
                [ 'status' => 403 ]
            );
        }

        return true;
    }

    /**
     * Success response
     *
     * @param mixed $data Response data
     * @param int   $status HTTP status code
     * @return WP_REST_Response
     */
    protected function success($data = null, $status = 200) {
        return new WP_REST_Response(
            [
                'success' => true,
                'data'    => $data,
            ],
            $status
        );
    }

    /**
     * Error response
     *
     * @param string $message Error message
     * @param int    $status HTTP status code
     * @param array  $data Additional data
     * @return WP_Error
     */
    protected function error($message, $status = 400, $data = []) {
        return new WP_Error(
            'yayboost_error',
            $message,
            array_merge( [ 'status' => $status ], $data )
        );
    }
}
