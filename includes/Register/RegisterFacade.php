<?php
namespace YayBoost\Register;

use YayBoost\Traits\Singleton;

/**
 * Register Facade.
 *
 * @method static RegisterFacade get_instance()
 */
class RegisterFacade {

    use Singleton;

    /** Hooks Initialization */
    protected function __construct() {
        add_filter( 'script_loader_tag', [ $this, 'add_entry_as_module' ], 10, 3 );
        add_action( 'init', [ $this, 'register_all_assets' ] );

        $is_prod = ! defined( 'YAYBOOST_DEV' ) || YAYBOOST_DEV !== true;
        if ( $is_prod && class_exists( '\YayBoost\Register\RegisterProd' ) ) {
            \YayBoost\Register\RegisterProd::get_instance();
        } elseif ( ! $is_prod && class_exists( '\YayBoost\Register\RegisterDev' ) ) {
            \YayBoost\Register\RegisterDev::get_instance();
        }
    }

    public function add_entry_as_module( $tag, $handle ) {
        if ( strpos( $handle, ScriptName::MODULE_PREFIX ) !== false ) {
            if ( strpos( $tag, 'type="' ) !== false ) {
                return preg_replace( '/\stype="\S+\s/', ' type="module" ', $tag, 1 );
            } else {
                return str_replace( ' src=', ' type="module" src=', $tag );
            }
        }
        return $tag;
    }

    public function register_all_assets() {
        wp_register_style(
            ScriptName::STYLE_SETTINGS,
            YAYBOOST_URL . 'assets/dist/style.css',
            [
                'woocommerce_admin_styles',
                'wp-components',
            ],
            YAYBOOST_VERSION
        );
    }
}
