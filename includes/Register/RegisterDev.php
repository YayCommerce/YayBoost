<?php
namespace YayBoost\Register;

use YayBoost\Traits\Singleton;

defined( 'ABSPATH' ) || exit;
/**
 * Register in Development Mode
 * Will get deleted in production
 */
class RegisterDev {
    use Singleton;

    /** Hooks Initialization */
    protected function __construct() {
        add_action( 'admin_footer', [ $this, 'render_dev_refresh' ], 5 );

        add_action( 'init', [ $this, 'register_all_scripts' ] );
    }

    public function render_dev_refresh() {
        echo '<script type="module">
        import RefreshRuntime from "http://localhost:3000/@react-refresh"
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
        </script>';
    }

    public function register_all_scripts() {
        $deps = [ 'react', 'react-dom', 'wp-hooks', 'wp-i18n', 'wp-components', 'wp-element' ];

        wp_register_script( ScriptName::ADMIN_SETTINGS, 'http://localhost:3000/main.tsx', $deps, null, true ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
    }
}
