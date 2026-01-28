<?php

namespace YayBoost\Admin;

use YayBoost\Register\RegisterFacade;
use YayBoost\Register\ScriptName;

/**
 * Admin Menu class
 */
class AdminMenu {

	public function register() {
		$this->init_hooks();
	}

	public function init_hooks() {
		YayCommerceMenu\RegisterMenu::get_instance();
		RegisterFacade::get_instance();
		\add_action( 'admin_menu', array( $this, 'add_menu_page' ) );
		\add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
		add_filter( 'admin_body_class', array( $this, 'admin_body_class' ) );
	}

	public function admin_body_class( $classes ) {
		if ( strpos( $classes, 'yayboost-ui' ) === false ) {
			$classes .= ' yayboost-ui';
		}
		return $classes;
	}

	public function add_menu_page() {
		$menu_args = array(
			'parent_slug' => 'yaycommerce',
			'page_title'  => __( 'YayBoost Settings', 'yayboost' ),
			'menu_title'  => __( 'YayBoost', 'yayboost' ),
			'capability'  => 'manage_woocommerce',
			'menu_slug'   => 'yayboost',
			'function'    => array( $this, 'render_page' ),
			'position'    => 0,
		);
		add_submenu_page( $menu_args['parent_slug'], $menu_args['page_title'], $menu_args['menu_title'], $menu_args['capability'], $menu_args['menu_slug'], $menu_args['function'], $menu_args['position'] );
	}

	public function enqueue_scripts() {
		$screen    = get_current_screen();
		$screen_id = $screen ? $screen->id : '';
		if ( $screen_id !== 'yaycommerce_page_yayboost' ) {
			return;
		}

		// Enqueue CSS
		wp_enqueue_style( ScriptName::STYLE_SETTINGS );

		// Enqueue JS
		wp_enqueue_script( ScriptName::ADMIN_SETTINGS );

        // Localize script with API data
        wp_localize_script(
            ScriptName::ADMIN_SETTINGS,
            'yayboostData',
            [
                'apiUrl'         => rest_url( 'yayboost/v1/' ),
                'nonce'          => wp_create_nonce( 'wp_rest' ),
                'version'        => YAYBOOST_VERSION,
                'currencySymbol' => get_woocommerce_currency_symbol(),
                'hasReviewed'    => (bool) get_option( 'yayboost_has_reviewed', false ) ?? false,
                'dateFormat'     => get_option( 'date_format' ),
                'urls'           => array(
                    'images'       => YAYBOOST_URL . 'assets/images/',
                    'wcPlaceholderImage' => \wc_placeholder_img_src(),
                ),
            ]
        );
    }

	public function render_page() {
		ob_start();
		?>
			<style>
				#wpcontent .notice,
				.error, .updated {
					display: none;
				}
			</style>
			<div id="yayboost"></div>
		<?php
		$content = ob_get_clean();
		echo $content;
	}
}
