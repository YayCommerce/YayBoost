<?php
/**
 * Bootstrap Class
 *
 * @package YayBoost
 */

namespace YayBoost;

use YayBoost\Container\Container;

defined( 'ABSPATH' ) || exit;

/**
 * Main Bootstrap class for plugin initialization
 */
class Bootstrap {
    /**
     * Container instance
     *
     * @var Container
     */
    protected $container;

    /**
     * Service providers
     *
     * @var array
     */
    protected $providers = [];

    /**
     * Constructor
     */
    public function __construct() {
        $this->container = new Container();
    }

    /**
     * Initialize the plugin
     *
     * @return void
     */
    public function init() {
        // Register core services
        $this->register_core_services();

        // Register service provider
        $this->register_service_provider();

        // Initialize hooks
        $this->init_hooks();
    }

    /**
     * Register core services
     *
     * @return void
     */
    protected function register_core_services() {
        // Register container itself
        $this->container->instance( 'container', $this->container );

        // Register admin services
        $this->container->register(
            'admin.menu',
            function ($c) {
                return new Admin\AdminMenu();
            }
        );

        // Register API services
        $this->container->register(
            'api.router',
            function ($c) {
                return new API\Router( $c );
            }
        );
    }

    /**
     * Register service provider
     *
     * @return void
     */
    protected function register_service_provider() {
        $provider = new ServiceProvider();

        // Register phase
        $provider->register( $this->container );

        // Boot phase
        $provider->boot( $this->container );

        $this->providers[] = $provider;
    }

    /**
     * Initialize WordPress hooks
     *
     * @return void
     */
    protected function init_hooks() {

        // REST API initialization
        add_action( 'rest_api_init', [ $this, 'register_rest_routes' ] );

        // Register analytics cron hooks
        Analytics\AnalyticsAggregator::register();

        // Plugin loaded hook
        do_action( 'yayboost_loaded', $this->container );

        $this->container->resolve( 'admin.menu' )->register();

        // Plugin action links
        add_filter( 'plugin_action_links_' . YAYBOOST_BASENAME, [ $this, 'add_plugin_action_links' ] );
        add_filter( 'plugin_row_meta', [ $this, 'add_plugin_author_links' ], 10, 2 );
    }

    /**
     * Register REST API routes
     *
     * @return void
     */
    public function register_rest_routes() {
        $router = $this->container->resolve( 'api.router' );
        $router->register_routes();
    }

    /**
     * Get container instance
     *
     * @return Container
     */
    public function get_container() {
        return $this->container;
    }

    /**
     * Add plugin action links
     *
     * @param array $links The plugin action links
     * @return array The plugin action links
     */
    public function add_plugin_action_links( $links ) {
        array_unshift( $links, '<a href="' . admin_url( 'admin.php?page=yayboost' ) . '">' . __( 'Settings', 'yayboost-sales-booster-for-woocommerce' ) . '</a>' );
        return $links;
    }

    /**
     * Add plugin author links
     *
     * @param array  $links The plugin action links
     * @param string $file The plugin file
     * @return array The plugin action links
     */
    public function add_plugin_author_links( $links, $file ) {
        if ( YAYBOOST_BASENAME === $file ) {
            $links[] = '<a href="https://docs.yaycommerce.com/yayboost/getting-started/introduction" target="_blank">' . __( 'Docs', 'yayboost-sales-booster-for-woocommerce' ) . '</a>';
            $links[] = '<a href="https://yaycommerce.com/support/" target="_blank">' . __( 'Support', 'yayboost-sales-booster-for-woocommerce' ) . '</a>';
        }
        return $links;
    }
}
