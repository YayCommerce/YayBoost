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

		// Enqueue frontend assets
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );

		// Render popup HTML in footer
		add_action( 'wp_footer', array( $this, 'render_popup' ) );
	}

	/**
	 * Check if popup should be shown (cart has items)
	 *
	 * @return bool
	 */
	private function should_show_popup(): bool {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return false;
		}

		return WC()->cart->get_cart_contents_count() > 0;
	}

	/**
	 * Enqueue frontend assets
	 *
	 * @return void
	 */
	public function enqueue_assets(): void {
		if ( ! $this->should_show_popup() ) {
			return;
		}

		$this->enqueue_styles();
		$this->enqueue_scripts();
	}

	/**
	 * Enqueue CSS styles
	 *
	 * @return void
	 */
	private function enqueue_styles(): void {
		if ( wp_style_is( 'yayboost-exit-intent-popup', 'enqueued' ) ) {
			return;
		}

		$style_path = YAYBOOST_PATH . 'assets/css/exit-intent-popup.css';
		$version    = file_exists( $style_path ) ? filemtime( $style_path ) : YAYBOOST_VERSION;

		wp_enqueue_style(
			'yayboost-exit-intent-popup',
			YAYBOOST_URL . 'assets/css/exit-intent-popup.css',
			array(),
			$version
		);
	}

	/**
	 * Enqueue JavaScript and localize data
	 *
	 * @return void
	 */
	private function enqueue_scripts(): void {
		if ( wp_script_is( 'yayboost-exit-intent-popup', 'enqueued' ) ) {
			return;
		}

		$script_path = YAYBOOST_PATH . 'assets/js/exit-intent-popup.js';
		$version     = file_exists( $script_path ) ? filemtime( $script_path ) : YAYBOOST_VERSION;

		wp_enqueue_script(
			'yayboost-exit-intent-popup',
			YAYBOOST_URL . 'assets/js/exit-intent-popup.js',
			array( 'jquery' ),
			$version,
			true
		);

		wp_localize_script(
			'yayboost-exit-intent-popup',
			'yayboostExitIntentPopup',
			$this->get_localization_data()
		);
	}

	/**
	 * Get localization data for JavaScript
	 *
	 * @return array Localization data array.
	 */
	public function get_localization_data(): array {
		$settings = $this->get_settings();
		$offer    = $settings['offer'] ?? array();
		$content  = $settings['content'] ?? array();
		$trigger  = $settings['trigger'] ?? array();
		$behavior = $settings['behavior'] ?? 'checkout_page';

		$checkout_url = function_exists( 'wc_get_checkout_url' ) ? wc_get_checkout_url() : '';

		return array(
			'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
			'nonce'       => wp_create_nonce( 'yayboost_exit_intent' ),
			'trigger'     => array(
				'leaves_viewport'     => ! empty( $trigger['leaves_viewport'] ),
				'back_button_pressed' => ! empty( $trigger['back_button_pressed'] ),
			),
			'content'     => array(
				'headline'    => $content['headline'] ?? '',
				'message'     => $content['message'] ?? '',
				'button_text' => $content['button_text'] ?? '',
			),
			'offer'       => array(
				'type'    => $offer['type'] ?? 'percent',
				'value'   => $offer['value'] ?? 20,
				'prefix'  => $offer['prefix'] ?? 'GO-',
				'expires' => $offer['expires'] ?? 1,
			),
			'behavior'    => $behavior,
			'checkoutUrl' => $checkout_url,
		);
	}

	/**
	 * Render popup HTML in footer
	 *
	 * @return void
	 */
	public function render_popup(): void {
		if ( ! $this->should_show_popup() ) {
			return;
		}

		$settings = $this->get_settings();
		$content  = $settings['content'] ?? array();

		?>
		<div id="yayboost-exit-intent-popup" class="yayboost-exit-intent-popup" style="display: none;">
			<div class="yayboost-exit-intent-popup__overlay"></div>
			<div class="yayboost-exit-intent-popup__content">
				<button class="yayboost-exit-intent-popup__close" aria-label="<?php esc_attr_e( 'Close', 'yayboost' ); ?>">&times;</button>
				<h2 class="yayboost-exit-intent-popup__headline"><?php echo esc_html( $content['headline'] ?? '' ); ?></h2>
				<p class="yayboost-exit-intent-popup__message"><?php echo esc_html( $content['message'] ?? '' ); ?></p>
				<button class="yayboost-exit-intent-popup__button"><?php echo esc_html( $content['button_text'] ?? '' ); ?></button>
			</div>
		</div>
		<?php
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
