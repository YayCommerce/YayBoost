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
     * AJAX handler instance
     *
     * @var ExitIntentPopupAjaxHandler
     */
    private $ajax_handler;

    /**
     * Constructor
     *
     * @param \YayBoost\Container\Container $container DI container.
     */
    public function __construct( $container ) {
        parent::__construct( $container );

        $this->ajax_handler = new ExitIntentPopupAjaxHandler( $this );

        // Register AJAX hooks
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

        // Enqueue frontend assets
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );

        // Render popup HTML in footer
        add_action( 'wp_footer', [ $this, 'render_popup' ] );

        // Hook into WooCommerce cart updates
        add_action( 'woocommerce_add_to_cart', [ $this, 'handle_cart_update' ], 10, 6 );
        add_action( 'woocommerce_cart_item_removed', [ $this, 'handle_cart_update' ], 10, 1 );
        add_action( 'woocommerce_cart_item_restored', [ $this, 'handle_cart_update' ], 10, 1 );
        add_action( 'woocommerce_after_cart_item_quantity_update', [ $this, 'handle_cart_update' ], 10, 1 );

        // Add cart fragments for AJAX cart updates
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
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        // Always enqueue assets if feature is enabled
        // JavaScript will handle showing/hiding based on cart state
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

        wp_enqueue_style(
            'yayboost-exit-intent-popup',
            YAYBOOST_URL . 'assets/css/exit-intent-popup.css',
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
        if ( wp_script_is( 'yayboost-exit-intent-popup', 'enqueued' ) ) {
            return;
        }

        wp_enqueue_script(
            'yayboost-exit-intent-popup',
            YAYBOOST_URL . 'assets/js/exit-intent-popup.js',
            [ 'jquery' ],
            YAYBOOST_VERSION,
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
        $offer    = $settings['offer'] ?? [];
        $content  = $settings['content'] ?? [];
        $trigger  = $settings['trigger'] ?? [];
        $behavior = $settings['behavior'] ?? 'checkout_page';

        $checkout_url = function_exists( 'wc_get_checkout_url' ) ? wc_get_checkout_url() : '';
        $cart_url     = function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : '';

        return [
            'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
            'nonce'       => wp_create_nonce( 'yayboost_exit_intent' ),
            'trigger'     => [
                'leaves_viewport'     => ! empty( $trigger['leaves_viewport'] ),
                'back_button_pressed' => ! empty( $trigger['back_button_pressed'] ),
            ],
            'content'     => [
                'headline'    => $content['headline'] ?? '',
                'message'     => $content['message'] ?? '',
                'button_text' => $content['button_text'] ?? '',
            ],
            'offer'       => [
                'type'    => $offer['type'] ?? 'percent',
                'value'   => $offer['value'] ?? 20,
                'prefix'  => $offer['prefix'] ?? 'GO-',
                'expires' => $offer['expires'] ?? 1,
            ],
            'behavior'    => $behavior,
            'checkoutUrl' => $checkout_url,
            'cartUrl'     => $cart_url,
        ];
    }

    /**
     * Render popup HTML in footer
     *
     * @return void
     */
    public function render_popup(): void {
        // Always render popup HTML if feature is enabled
        // JavaScript will control visibility based on cart state
        $settings = $this->get_settings();
        $content  = $settings['content'] ?? [];
        $has_items = $this->should_show_popup();

        ?>
        <div id="yayboost-exit-intent-popup" class="yayboost-exit-intent-popup" style="display: none;" data-has-items="<?php echo $has_items ? '1' : '0'; ?>">
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
     * Handle cart update events
     *
     * @param mixed $cart_item_key Cart item key or product ID.
     * @param int   $product_id Product ID (optional).
     * @param int   $quantity Quantity (optional).
     * @param int   $variation_id Variation ID (optional).
     * @param array $variation Variation data (optional).
     * @param array $cart_item_data Cart item data (optional).
     * @return void
     */
    public function handle_cart_update( $cart_item_key = null, $product_id = null, $quantity = null, $variation_id = null, $variation = null, $cart_item_data = null ): void {
        // This method is called when cart is updated
        // The actual sync happens via cart fragments in add_cart_fragments()
    }

    /**
     * Add cart fragments for exit intent popup sync
     *
     * @param array $fragments Existing cart fragments.
     * @return array Modified cart fragments.
     */
    public function add_cart_fragments( array $fragments ): array {
        if ( ! $this->is_enabled() ) {
            return $fragments;
        }

        $has_items = $this->should_show_popup();
        
        // Add popup state to fragments
        $fragments['yayboost_exit_intent_popup_state'] = [
            'has_items' => $has_items,
            'cart_count' => function_exists( 'WC' ) && WC()->cart ? WC()->cart->get_cart_contents_count() : 0,
        ];

        return $fragments;
    }

    /**
     * Get default settings
     *
     * @return array Default settings.
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'  => true,
                'trigger'  => [
                    'leaves_viewport'     => true,
                    'back_button_pressed' => true,
                ],
                'offer'    => [
                    'type'    => 'percent',
                    'value'   => 20,
                    'prefix'  => 'GO-',
                    'expires' => 1,
                ],

                'content'  => [
                    'headline'    => __( 'You\'re leaving?', 'yayboost' ),
                    'message'     => __( 'But we have a discount coupon waiting for you', 'yayboost' ),
                    'button_text' => __( 'Get 20% discount', 'yayboost' ),
                ],
                'behavior' => 'checkout_page',
            ]
        );
    }
}
