<?php
/**
 * REST API Router
 *
 * @package YayBoost
 */

namespace YayBoost\API;

use YayBoost\Container\Container;

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
    public function register_routes(): void {

        $this->register_controller( new Controllers\AdminController( $this->container ) );

        // Register feature routes
        $this->register_controller( new Controllers\FeatureController( $this->container ) );

        // Register entity routes
        $this->register_controller( new Controllers\EntityController( $this->container ) );

        // Register settings routes
        $this->register_controller( new Controllers\SettingsController( $this->container ) );

        // Register FBT routes
        $this->register_controller( new Controllers\FBTController( $this->container ) );
    
        // Register Product Data routes
        $this->register_controller( new Controllers\ProductDataController( $this->container ) );

        // Register Analytics routes
        $this->register_controller( new Controllers\AnalyticsController( $this->container ) );
    }

    /**
     * Register a controller
     *
     * @param Controllers\BaseController $controller
     * @return void
     */
    protected function register_controller(Controllers\BaseController $controller): void {
        $controller->register_routes();
        $this->controllers[] = $controller;
    }

    /**
     * Get API namespace
     *
     * @return string
     */
    public static function get_namespace(): string {
        return self::NAMESPACE;
    }
}
