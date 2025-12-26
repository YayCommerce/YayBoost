<?php
/**
 * Live Visitor Count Feature
 *
 * Displays a live visitor count on single product pages.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\LiveVisitorCount;

use YayBoost\Features\AbstractFeature;

/**
 * Live Visitor Count feature implementation
 */
class LiveVisitorCountFeature extends AbstractFeature {
	/**
	 * Feature ID
	 *
	 * @var string
	 */
	protected $id = 'live_visitor_count';

	/**
	 * Feature name
	 *
	 * @var string
	 */
	protected $name = 'Live Visitor Count';

	/**
	 * Feature description
	 *
	 * @var string
	 */
	protected $description = 'Display a short text with the number of visitors viewing the current page';

	/**
	 * Feature category
	 *
	 * @var string
	 */
	protected $category = 'others';

	/**
	 * Feature icon (Phosphor icon name)
	 *
	 * @var string
	 */
	protected $icon = 'users';

	/**
	 * Display priority
	 *
	 * @var int
	 */
	protected $priority = 1;

	/**
	 * Initialize the feature
	 *
	 * @return void
	 */
	public function init(): void {
		// Display bar based on position setting
		$settings = $this->get_settings();
		$position = $settings['position'] ?? 'top';

		// Hook into appropriate locations based on show_on setting
		// $show_on = $settings['show_on'] ?? array( 'cart', 'checkout' );

		// if ( in_array( 'cart', $show_on, true ) ) {
		//  add_action( 'woocommerce_before_cart', array( $this, 'render_bar' ) );
		// }

		// if ( in_array( 'checkout', $show_on, true ) ) {
		//  add_action( 'woocommerce_before_checkout_form', array( $this, 'render_bar' ) );
		// }

		// if ( in_array( 'mini_cart', $show_on, true ) ) {
		//  add_action( 'woocommerce_before_mini_cart', array( $this, 'render_bar' ) );
		// }

		// // Enqueue styles
		// add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );

		// // AJAX endpoint for dynamic updates
		// add_action( 'wp_ajax_yayboost_get_shipping_bar', array( $this, 'ajax_get_bar_data' ) );
		// add_action( 'wp_ajax_nopriv_yayboost_get_shipping_bar', array( $this, 'ajax_get_bar_data' ) );
	}

	/**
	 * Get default settings
	 *
	 * @return array
	 */
	protected function get_default_settings(): array {
		return array_merge(
			parent::get_default_settings(),
			array(
				'tracking_mode' => 'real-tracking',
				'real_tracking' => array(
					'active_windows'        => '5',
					'minimum_count_display' => '1',
				),
				'simulated'     => array(
					'min' => '10',
					'max' => '50',
				),
				'display'       => array(
					'text'     => '{count} visitors are viewing this page',
					'icon'     => 'eye',
					'position' => 'below_product_title',
				),
				'style'         => array(
					'style'            => 'style_1',
					'text_color'       => '#a74c3c',
					'background_color' => '#fff3f3',
				),
				'apply_on'      => array(
					'apply'               => 'all',
					'specific_categories' => array(),
					'specific_products'   => array(),
				),
			)
		);
	}
}
