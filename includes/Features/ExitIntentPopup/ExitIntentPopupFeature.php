<?php
/**
 * Exit Intent Popup Feature
 *
 * Displays a popup when a customer is about to leave the page.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\ExitIntentPopup;

use YayBoost\Features\AbstractFeature;

/**
 * Exit Intent Popup feature implementation
 */
class ExitIntentPopupFeature extends AbstractFeature {

	/**
	 * Feature ID
	 *
	 * @var string
	 */
	protected $id = 'exit_intent_popup';

	/**
	 * Feature name
	 *
	 * @var string
	 */
	protected $name = 'Exit-Intent Popup';

	/**
	 * Feature description
	 *
	 * @var string
	 */
	protected $description = 'Show a popup when customers try to leave with items in cart.<br/> Offer discount to complete purchase NOW.';

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
	protected $icon = 'arrow-square-out';

	/**
	 * Display priority
	 *
	 * @var int
	 */
	protected $priority = 2;

	/**
	 * Constructor
	 *
	 * @param \YayBoost\Container\Container $container DI container.
	 */
	public function __construct( $container ) {
		parent::__construct( $container );
	}

	/**
	 * Initialize the feature
	 *
	 * @return void
	 */
	public function init(): void {
		if ( ! $this->is_enabled() ) {
			return;
		}

		// // Initialize block
		// new LiveVisitorCountBlock( $this );
	}

	/**
	 * Get default settings
	 *
	 * @return array Default settings.
	 */
	protected function get_default_settings(): array {
		return array_merge(
			parent::get_default_settings(),
			array(
				'enabled'  => true,
				'trigger'  => array(
					'leaves_viewport'     => true,
					'back_button_pressed' => true,
				),
				'offer'    => array(
					'type'    => 'percent',
					'value'   => 20,
					'prefix'  => 'GO-',
					'expires' => 1, // 1 hour
				),

				'content'  => array(
					'headline'    => __( 'Wait! Don\'t leave!', 'yayboost' ),
					'message'     => __( 'Completed your order now and receive 10% discount', 'yayboost' ),
					'button_text' => __( 'Complete my order', 'yayboost' ),
				),
				'behavior' => 'checkout_page',
			)
		);
	}
}
