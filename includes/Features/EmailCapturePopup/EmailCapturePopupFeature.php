<?php
/**
 * Email Capture Popup Feature
 *
 * Show a popup when guests click View cart. Capture email before redirecting to cart.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

use YayBoost\Features\AbstractFeature;

defined( 'ABSPATH' ) || exit;

/**
 * Email Capture Popup feature implementation
 */
class EmailCapturePopupFeature extends AbstractFeature {

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'email_capture_popup';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Email Popup';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Collect emails from guests before they leave. Stay in touch and send follow-up messages.';

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
    protected $icon = 'envelope-simple';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 3;

    /**
     * AJAX handler instance
     *
     * @var EmailCapturePopupAjaxHandler
     */
    private $ajax_handler;

    /**
     * Constructor
     *
     * @param \YayBoost\Container\Container $container DI container.
     */
    public function __construct( $container ) {
        parent::__construct( $container );
        $this->ajax_handler = new EmailCapturePopupAjaxHandler( $this );
        $this->ajax_handler->register_hooks();
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

        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );
        add_action( 'wp_footer', [ $this, 'render_popup' ] );
        add_filter( 'woocommerce_add_to_cart_fragments', [ $this, 'add_cart_fragments' ] );
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
     * Check if user is eligible (guest only, not on cart page)
     * Cart items check is done via data-has-items and fragment sync
     *
     * @return bool
     */
    private function is_eligible(): bool {
        if ( is_user_logged_in() ) {
            return false;
        }
        if ( function_exists( 'is_cart' ) && is_cart() ) {
            return false;
        }
        return true;
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        if ( function_exists( 'is_cart' ) && is_cart() ) {
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
        if ( wp_style_is( 'yayboost-email-capture-popup', 'enqueued' ) ) {
            return;
        }

        wp_enqueue_style(
            'yayboost-email-capture-popup',
            YAYBOOST_URL . 'assets/css/email-capture-popup.css',
            [],
            YAYBOOST_VERSION
        );
    }

    /**
     * Enqueue JavaScript and localize data
     *
     * @return void
     */
    private function enqueue_scripts(): void {
        if ( wp_script_is( 'yayboost-email-capture-popup', 'enqueued' ) ) {
            return;
        }

        $deps = [ 'jquery' ];
        if ( wp_script_is( 'wc-cart-fragments', 'registered' ) ) {
            if ( ! wp_script_is( 'wc-cart-fragments', 'enqueued' ) ) {
                wp_enqueue_script( 'wc-cart-fragments' );
            }
            $deps[] = 'wc-cart-fragments';
        }

        wp_enqueue_script(
            'yayboost-email-capture-popup',
            YAYBOOST_URL . 'assets/js/email-capture-popup.js',
            $deps,
            YAYBOOST_VERSION,
            true
        );

        wp_localize_script(
            'yayboost-email-capture-popup',
            'yayboostEmailCapturePopup',
            $this->get_localization_data()
        );
    }

    /**
     * Get localization data for JavaScript
     *
     * @return array
     */
    public function get_localization_data(): array {
        $settings         = $this->get_settings();
        $default_settings = $this->get_default_settings();
        $content          = $settings['content'] ?? $default_settings['content'];

        $cart_url = function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : '';

        return [
            'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
            'nonce'      => wp_create_nonce( EmailCapturePopupAjaxHandler::NONCE_ACTION ),
            'cartUrl'    => $cart_url,
            'content'    => [
                'headline'         => $content['headline'] ?? $default_settings['content']['headline'],
                'message'          => $content['message'] ?? $default_settings['content']['message'],
                'buttonText'       => $content['button_text'] ?? $default_settings['content']['button_text'],
                'inputPlaceholder' => \__( 'Enter your email', 'yayboost' ),
            ],
            'isEligible' => $this->is_eligible(),
            'messages'   => [
                'invalidEmail' => \__( 'Please enter a valid email address.', 'yayboost' ),
                'error'        => \__( 'Something went wrong. Please try again.', 'yayboost' ),
            ],
        ];
    }

    /**
     * Render popup HTML in footer
     *
     * @return void
     */
    public function render_popup(): void {
        if ( ! $this->is_eligible() ) {
            return;
        }

        $settings  = $this->get_settings();
        $content   = $settings['content'] ?? [];
        $has_items = $this->should_show_popup();

        $headline    = $content['headline'] ?? \__( 'Stay in touch!', 'yayboost' );
        $message     = $content['message'] ?? \__( 'Enter your email to receive updates and exclusive offers.', 'yayboost' );
        $button_text = $content['button_text'] ?? \__( 'Submit email', 'yayboost' );
        $placeholder = \__( 'Enter your email', 'yayboost' );

        ?>
        <!-- Hidden element for WooCommerce cart fragment replacement (data-has-items synced via fragments) -->
        <span id="yayboost-email-capture-popup-state" class="yayboost-email-capture-cart-state" data-has-items="<?php echo $has_items ? '1' : '0'; ?>" aria-hidden="true" style="display:none!important"></span>
        <div id="yayboost-email-capture-popup" class="yayboost-email-capture-popup" style="display: none;" data-has-items="<?php echo $has_items ? '1' : '0'; ?>">
            <div class="yayboost-email-capture-popup__overlay"></div>
            <div class="yayboost-email-capture-popup__content">
                <button class="yayboost-email-capture-popup__close" aria-label="<?php esc_attr_e( 'Close', 'yayboost' ); ?>">&times;</button>
                <h2 class="yayboost-email-capture-popup__headline"><?php echo esc_html( $headline ); ?></h2>
                <p class="yayboost-email-capture-popup__message"><?php echo esc_html( $message ); ?></p>
                <input type="email" class="yayboost-email-capture-popup__input" placeholder="<?php echo esc_attr( $placeholder ); ?>" />
                <button class="yayboost-email-capture-popup__button"><?php echo esc_html( $button_text ); ?></button>
            </div>
        </div>
        <?php
    }

    /**
     * Add cart fragments for popup state sync.
     * Uses WooCommerce cart fragments API - no separate AJAX needed.
     *
     * @param array $fragments Existing cart fragments.
     * @return array Modified cart fragments.
     */
    public function add_cart_fragments( array $fragments ): array {
        if ( ! $this->is_enabled() ) {
            return $fragments;
        }

        $has_items = $this->should_show_popup();
        $data_attr = $has_items ? '1' : '0';

        // HTML fragment: WooCommerce replaces #yayboost-email-capture-popup-state in DOM
        $fragments['#yayboost-email-capture-popup-state'] = sprintf(
            '<span id="yayboost-email-capture-popup-state" class="yayboost-email-capture-cart-state" data-has-items="%s" aria-hidden="true" style="display:none!important"></span>',
            esc_attr( $data_attr )
        );

        // Object for added_to_cart / removed_from_cart events (fragments passed to JS)
        $fragments['yayboost_email_capture_popup_state'] = [
            'has_items' => $has_items,
        ];

        return $fragments;
    }

    /**
     * Get default settings
     *
     * @return array
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'       => false,
                'content'       => [
                    'headline'    => \__( 'Stay in touch!', 'yayboost' ),
                    'message'     => \__( 'Enter your email to receive updates and exclusive offers.', 'yayboost' ),
                    'button_text' => \__( 'Submit email', 'yayboost' ),
                ],
                'email_trigger' => [
                    'send_after_days' => 1,
                    'subject'         => \__( 'You left something in your cart', 'yayboost' ),
                    'email_content'   => \__( 'Your cart items are still waiting for you. Complete your purchase whenever you are ready.', 'yayboost' ),
                ],
            ]
        );
    }
}
