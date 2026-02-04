<?php
namespace YayBoost\Register;

use YayBoost\Traits\Singleton;

defined( 'ABSPATH' ) || exit;
/** Register in Production Mode */
class RegisterProd {
    use Singleton;

    /** Hooks Initialization */
    protected function __construct() {
        add_action( 'init', [ $this, 'register_all_scripts' ] );
    }

    public function register_all_scripts() {
        $deps = [ 'react', 'react-dom', 'wp-hooks', 'wp-i18n', 'wp-components', 'wp-element' ];

        wp_register_script( ScriptName::ADMIN_SETTINGS, YAYBOOST_URL . 'assets/dist/main.js', $deps, time(), true );
    }
}
