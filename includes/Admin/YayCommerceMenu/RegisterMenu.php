<?php
/**
 * Add YayCommerce menu or submenu in admin
 *
 * @package YayBoost
 */

namespace YayBoost\Admin\YayCommerceMenu;

use YayBoost\Traits\Singleton;

defined( 'ABSPATH' ) || exit;

/**
 * Declare class
 */
class RegisterMenu {

    use Singleton;

    /**
     * Contains intance of class
     */
    protected static $instance = null;

    /**
     * Contains position of the menu
     *
     * @var int
     */
    public static $position = 56;
    // After WooCommerce menu

    /**
     * Contains capability of YayCommerce menu
     *
     * @var string
     */
    public static $capability = 'manage_options';

    /**
     * Get instance - singleton pattern
     */
    public static function get_instance() {
        if ( empty( self::$instance ) ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    /**
     * Constructor
     */
    public function __construct() {
        add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_yaycommerce_menu_scripts' ] );
        add_action( 'admin_menu', [ $this, 'settings_menu' ] );
        add_action( 'admin_menu', [ $this, 'add_placeholder_menu' ], 100 );
        OtherPluginsMenu::get_instance();
    }

    /**
     * Add YayCommerce menus
     */
    public function settings_menu() {
        global $admin_page_hooks;
        if ( ! isset( $admin_page_hooks['yaycommerce'] ) ) {
            add_menu_page( 'yaycommerce', 'YayCommerce', self::$capability, 'yaycommerce', null, self::get_logo_url(), self::$position );

            $this->add_submenus();
            self::delete_yaycommerce_nav();
        }
    }

    public function get_submenus() {

        $submenus['yaycommerce-help'] = [
            'parent'             => 'yaycommerce',
            'name'               => __( 'Help', 'yayboost' ),
            'capability'         => 'manage_options',
            'render_callback'    => false,
            'load_data_callback' => false,
        ];

        /**
         * Temporarily until all Yay plugins has the same code
         */
        if ( function_exists( 'YayMail\\init' ) && class_exists( '\YayMail\License\LicenseHandler' ) ) {
            $licensing_plugins_yay_mail = \YayMail\License\LicenseHandler::get_licensing_plugins();
        }
        if ( function_exists( 'YAYDP\\load_plugin' ) && class_exists( '\YAYDP\License\License_Handler' ) ) {
            $licensing_plugins_yay_pricing = \YAYDP\License\License_Handler::get_licensing_plugins();
        }

        if ( function_exists( 'Yay_Currency\\plugin_init' ) && class_exists( '\Yay_Currency\License\LicenseHandler' ) ) {
            $licensing_plugins_yay_currency = \Yay_Currency\License\LicenseHandler::get_licensing_plugins();
        }

        if ( function_exists( 'Yay_Swatches\\init' ) && class_exists( '\Yay_Swatches\License\LicenseHandler' ) ) {
            $licensing_plugins_yay_swatches = \Yay_Swatches\License\LicenseHandler::get_licensing_plugins();
        }
        if ( function_exists( 'YayExtra\\plugins_loaded' ) && class_exists( '\YayExtra\License\LicenseHandler' ) ) {
            $licensing_plugins_yay_extra = \YayExtra\License\LicenseHandler::get_licensing_plugins();
        }

        if ( function_exists( 'YaySMTP\\init' ) && class_exists( '\YaySMTP\License\LicenseHandler' ) ) {
            $licensing_plugins_yay_smtp = \YaySMTP\License\LicenseHandler::get_licensing_plugins();
        }
        /** -------- */

        $yay_licensing_plugins = apply_filters( 'yaycommerce_licensing_plugins', [] );

        if ( ! empty( $licensing_plugins_yay_mail ) || ! empty( $licensing_plugins_yay_pricing ) || ! empty( $licensing_plugins_yay_currency ) || ! empty( $licensing_plugins_yay_swatches ) || ! empty( $licensing_plugins_yay_extra ) || ! empty( $licensing_plugins_yay_smtp ) || ! empty( $yay_licensing_plugins ) ) {
            $submenus['yaycommerce-licenses'] = [
                'parent'             => 'yaycommerce',
                'name'               => __( 'Licenses', 'yayboost' ),
                'capability'         => 'manage_options',
                'render_callback'    => [ '\YAYDP\Admin\YayCommerceMenu\LicensesMenu', 'render' ],
                'load_data_callback' => [ '\YAYDP\Admin\YayCommerceMenu\LicensesMenu', 'load_data' ],
            ];
        }

        $submenus['yaycommerce-other-plugins'] = [
            'parent'             => 'yaycommerce',
            'name'               => __( 'Other plugins', 'yayboost' ),
            'capability'         => 'manage_options',
            'render_callback'    => [ '\YAYDP\Admin\YayCommerceMenu\OtherPluginsMenu', 'render' ],
            'load_data_callback' => [ '\YAYDP\Admin\YayCommerceMenu\OtherPluginsMenu', 'load_data' ],
        ];

        return $submenus;
    }

    public function add_submenus() {
        foreach ( $this->get_submenus() as $id => $submenu ) {
            $page_id = add_submenu_page(
                $submenu['parent'],
                $submenu['name'],
                $submenu['name'],
                $submenu['capability'],
                $id,
                $submenu['render_callback'],
                isset( $submenu['position'] ) ? $submenu['position'] : null
            );
            add_action( 'load-' . $page_id, $submenu['load_data_callback'] );
        }
    }

    public function enqueue_yaycommerce_menu_scripts() {
        wp_enqueue_script( 'yaycommerce-menu', plugin_dir_url( __FILE__ ) . 'assets/js/yaycommerce-menu.js', [ 'jquery' ], '1.0', true );
    }

    public static function get_logo_url() {
        return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQ2LjI0NzYgNi40MDg5NkM0Ni4yNDc2IDkuOTQ4MTYgNDMuMzc3OCAxMi44MTc5IDM5LjgzODYgMTIuODE3OUMzNi4yOTk0IDEyLjgxNzkgMzMuNDI5NyA5Ljk0ODE2IDMzLjQyOTcgNi40MDg5NkMzMy40Mjk3IDIuODY5NzYgMzYuMjk4MSAwIDM5LjgzODYgMEM0My4zNzkxIDAgNDYuMjQ3NiAyLjg2OTc2IDQ2LjI0NzYgNi40MDg5NlpNMS4xNjQ3MSAyMi45OTI2Qy0wLjIxODk3MiAyMy4xMzIyIC0wLjQzNzg1MiAyNS4wNTg2IDAuODc5MjY4IDI1LjUwNEM5LjI1NDMxIDI4LjMzNjYgMjEuMzAwNCAzMC45OTUyIDI3LjI0OTggMzIuMjM0MkMyOS4yOTkxIDMyLjY2MDUgMzAuNjIzOSAzNC42NDgzIDMwLjI0MTIgMzYuNzA2NkMyOC41NDUyIDQ1LjgwNjEgMjUuMzc4NSA1NS41Mjc3IDIzLjM2ODkgNjIuMzM0N0MyMi45ODYyIDYzLjYzMTQgMjQuNTk5IDY0LjU3MjIgMjUuNTM4NSA2My42MDA2QzQ3LjIxMDIgNDEuMjAxOSA1OS4zODk0IDE4LjE5OSA2My44Njk0IDguNzIzMkM2NC40MjM2IDcuNTUwNzIgNjMuMTAwMSA2LjM4NzIgNjIuMDA0NCA3LjA4MDk2QzQ1LjM5MTMgMTcuNjA2NCAxMy44NTU5IDIxLjcxNzggMS4xNjQ3MSAyMi45OTI2WiIgZmlsbD0iI0E3QUFBRCIvPgo8L3N2Zz4=';
    }

    public static function delete_yaycommerce_nav() {
        remove_submenu_page( 'yaycommerce', 'yaycommerce' );
    }

    public function add_placeholder_menu() {
        global $submenu;
        if ( ! isset( $submenu['yaycommerce'] ) ) {
            return;
        }

        $has_plugin_menu = false;
        foreach ( $submenu['yaycommerce'] as $item ) {
            if ( 'yayboost' === $item[2] ) {
                $has_plugin_menu = true;
            }
        }
        if ( ! $has_plugin_menu ) {
            add_submenu_page( 'yaycommerce', __( 'YayBoost', 'yayboost' ), __( 'YayBoost', 'yayboost' ), 'manage_woocommerce', 'yayboost', [ $this, 'render_placeholder_menu' ], 0 );
        }
    }

    public function render_placeholder_menu() {
        wp_safe_redirect( admin_url( 'admin.php?page="yaycommerce-licenses"' ) );
    }
}

RegisterMenu::get_instance();
