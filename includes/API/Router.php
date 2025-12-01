<?php
/**
 * REST API Router
 *
 * @package YayBoost
 */

namespace YayBoost\API;

use YayBoost\Container\Container;
use WP_REST_Server;

/**
 * Handles REST API route registration
 */
class Router {
    /**
     * API namespace
     *
     * @var string
     */
    const NAMESPACE = 'yayboost/v1';

    /**
     * Container instance
     *
     * @var Container
     */
    protected $container;

    /**
     * Registered controllers
     *
     * @var array
     */
    protected $controllers = [];

    /**
     * Constructor
     *
     * @param Container $container
     */
    public function __construct(Container $container) {
        $this->container = $container;
    }

    /**
     * Register all routes
     *
     * @return void
     */
    public function register_routes() {
        // Register feature routes
        $this->register_controller(new Controllers\FeatureController($this->container));
        
        // Register settings routes
        $this->register_controller(new Controllers\SettingsController($this->container));
    }

    /**
     * Register a controller
     *
     * @param Controllers\BaseController $controller
     * @return void
     */
    protected function register_controller($controller) {
        $controller->register_routes();
        $this->controllers[] = $controller;
    }

    /**
     * Get API namespace
     *
     * @return string
     */
    public static function get_namespace() {
        return self::NAMESPACE;
    }
}

