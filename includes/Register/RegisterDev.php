<?php
namespace YayBoost\Register;

use YayBoost\Traits\Singleton;

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
        $deps = [ 'react', 'react-dom', 'wp-hooks', 'wp-i18n', 'wp-components' ];

        wp_register_script( ScriptName::ADMIN_SETTINGS, 'http://localhost:3000/main.tsx', $deps, null, true ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion
    }

        /**
         * Render Vite module script (helper method for blocks)
         * React Refresh is already rendered in admin_footer, so this only loads the module
         *
         * @param string $script_url Vite dev server script URL
         * @return void
         */
    public static function render_vite_module( string $script_url ): void {
        if ( ! defined( 'YAYBOOST_DEV' ) || ! YAYBOOST_DEV ) {
            return;
        }

        ?>
        <script type="module" src="http://localhost:3000/@vite/client"></script>
        <script type="module" src="<?php echo esc_url( $script_url ); ?>"></script>
        <?php
    }
}
