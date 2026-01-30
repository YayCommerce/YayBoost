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
     * Tracker instance
     *
     * @var ExitIntentPopupTracker
     */
    private $tracker;

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

        $this->tracker      = new ExitIntentPopupTracker( $this );
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

        // Add cart fragments for AJAX cart updates
        add_filter( 'woocommerce_add_to_cart_fragments', [ $this, 'add_cart_fragments' ] );

        // Conversion tracking
        add_action( 'woocommerce_payment_complete', [ $this, 'handle_payment_complete' ] );
        add_action( 'woocommerce_order_status_completed', [ $this, 'handle_order_completed' ], 10, 2 );
    }

    /**
     * Get tracker instance
     *
     * @return ExitIntentPopupTracker Tracker instance.
     */
    public function get_tracker(): ExitIntentPopupTracker {
        return $this->tracker;
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
        $settings         = $this->get_settings();
        $default_settings = $this->get_default_settings();
        $offer            = $settings['offer'] ?? $default_settings['offer'];
        $content          = $settings['content'] ?? $default_settings['content'];
        $trigger          = $settings['trigger'] ?? $default_settings['trigger'];
        $behavior         = $settings['behavior'] ?? $default_settings['behavior'];

        $checkout_url = function_exists( 'wc_get_checkout_url' ) ? wc_get_checkout_url() : '';
        $cart_url     = function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : '';
        $shop_url     = function_exists( 'wc_get_page_permalink' ) ? wc_get_page_permalink( 'shop' ) : '';

        // Check eligibility from tracker
        $is_eligible = $this->tracker->is_eligible();

        return [
            'ajaxUrl'     => admin_url( 'admin-ajax.php' ),
            'nonce'       => wp_create_nonce( ExitIntentPopupAjaxHandler::NONCE_ACTION ),
            'isEligible'  => $is_eligible,
            'trigger'     => [
                'leavesViewport'    => ! empty( $trigger['leaves_viewport'] ),
                'backButtonPressed' => ! empty( $trigger['back_button_pressed'] ),
            ],
            'content'     => [
                'headline'   => $content['headline'] ?? $default_settings['content']['headline'],
                'message'    => $content['message'] ?? $default_settings['content']['message'],
                'buttonText' => $content['button_text'] ?? $default_settings['content']['button_text'],
            ],
            'offer'       => [
                'type'    => $offer['type'] ?? $default_settings['offer']['type'],
                'value'   => $offer['value'] ?? $default_settings['offer']['value'],
                'prefix'  => $offer['prefix'] ?? $default_settings['offer']['prefix'],
                'expires' => $offer['expires'] ?? $default_settings['offer']['expires'],
            ],
            'behavior'    => $behavior,
            'checkoutUrl' => $checkout_url,
            'cartUrl'     => $cart_url,
            'shopUrl'     => $shop_url,
        ];
    }

    /**
     * Render popup HTML in footer
     *
     * @return void
     */
    public function render_popup(): void {
        $settings    = $this->get_settings();
        $content     = $settings['content'] ?? [];
        $has_items   = $this->should_show_popup();
        $is_eligible = $this->tracker->is_eligible();

        // Only render if eligible (server-side check)
        if ( ! $is_eligible ) {
            return;
        }

        // Replace {amount} with offer value
        $offer_type  = $settings['offer']['type'] ?? 'percent';
        $offer_value = $settings['offer']['value'] ?? 20;
        $button_text = $content['button_text'] ?? '';
        if ( $offer_type === 'percent' ) {
            $button_text = str_replace( '{amount}', $offer_value . '%', $button_text );
        } elseif ( $offer_type === 'fixed_amount' ) {
            $button_text = str_replace( '{amount}', wc_price( (float) $offer_value ), $button_text );
        }

        ?>
        <div id="yayboost-exit-intent-popup" class="yayboost-exit-intent-popup" style="display: none;" data-has-items="<?php echo $has_items ? '1' : '0'; ?>">
            <div class="yayboost-exit-intent-popup__overlay"></div>
            <div class="yayboost-exit-intent-popup__content">
                <button class="yayboost-exit-intent-popup__close" aria-label="<?php esc_attr_e( 'Close', 'yayboost' ); ?>">&times;</button>
                <h2 class="yayboost-exit-intent-popup__headline"><?php echo esc_html( $content['headline'] ?? '' ); ?></h2>
                <p class="yayboost-exit-intent-popup__message"><?php echo esc_html( $content['message'] ?? '' ); ?></p>
                <button class="yayboost-exit-intent-popup__button"><?php echo wp_kses_post( $button_text ); ?></button>
            </div>
        </div>
        <?php
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
        ];

        return $fragments;
    }

    /**
     * Update feature settings with version bump
     *
     * @param array $settings New settings.
     * @return void
     */
    public function update_settings( array $settings ): void {
        $current = $this->get_settings();

        // Check if changing the coupon relavant settings

        $is_different_offer_type    = ($current['offer']['type'] ?? '') !== ($settings['offer']['type'] ?? '');
        $is_different_offer_value   = ($current['offer']['value'] ?? '') !== ($settings['offer']['value'] ?? '');
        $is_different_offer_prefix  = ($current['offer']['prefix'] ?? '') !== ($settings['offer']['prefix'] ?? '');
        $is_different_offer_expires = ($current['offer']['expires'] ?? '') !== ($settings['offer']['expires'] ?? '');

        // Check if settings actually changed (excluding version)
        $current_without_version  = $current;
        $settings_without_version = $settings;
        unset( $current_without_version['version'], $settings_without_version['version'] );

        $changed = $is_different_offer_type || $is_different_offer_value || $is_different_offer_prefix || $is_different_offer_expires;

        if ( $changed ) {
            // Bump version to invalidate all cached states
            $settings['version'] = ( $current['version'] ?? 1 ) + 1;
        } else {
            // Keep existing version
            $settings['version'] = $current['version'] ?? 1;
        }

        parent::update_settings( $settings );
    }

    /**
     * Save feature settings and clear coupon transients so new offer settings take effect.
     *
     * @param array $settings Settings to save.
     * @return void
     */
    protected function save_settings( array $settings ): void {
        parent::save_settings( $settings );
        ExitIntentPopupAjaxHandler::clear_transients();
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
                'version'  => 1,
                'trigger'  => [
                    'leaves_viewport'     => true,
                    'back_button_pressed' => true,
                ],
                'offer'    => [
                    'type'    => 'percent',
                    'value'   => 20,
                    'prefix'  => 'YAY-',
                    'expires' => 1,
                ],
                'content'  => [
                    'headline'    => __( 'You\'re leaving?', 'yayboost' ),
                    'message'     => __( 'But we have a discount coupon waiting for you', 'yayboost' ),
                    'button_text' => __( 'Get {amount} discount', 'yayboost' ),
                ],
                'behavior' => 'checkout_page',
                'tracking' => [
                    'cooldown_after_conversion' => 7,
                    'guest_token_expiry'        => 7,
                ],
            ]
        );
    }

    /**
     * Handle payment complete event
     *
     * Checks if order used exit intent coupon and marks converted.
     *
     * @param int $order_id Order ID.
     * @return void
     */
    public function handle_payment_complete( int $order_id ): void {
        $this->maybe_mark_converted( $order_id );
    }

    /**
     * Handle order status completed event
     *
     * Fallback for orders that don't trigger payment_complete.
     *
     * @param int      $order_id Order ID.
     * @param WC_Order $order    Order object.
     * @return void
     */
    public function handle_order_completed( int $order_id, $order = null ): void {
        $this->maybe_mark_converted( $order_id );
    }

    /**
     * Check if order used exit intent coupon and mark converted
     *
     * @param int $order_id Order ID.
     * @return void
     */
    private function maybe_mark_converted( int $order_id ): void {
        $order = wc_get_order( $order_id );
        if ( ! $order ) {
            return;
        }

        $user_id = $order->get_user_id();

        // Migrate guest state to user if applicable
        if ( $user_id ) {
            $this->migrate_guest_to_user( $user_id );
        }

        // Get current tracker state
        $state = $this->tracker->get_state();
        if ( ! $state || empty( $state['coupon_code'] ) ) {
            return;
        }

        // Check if this order used the exit intent coupon
        $exit_coupon   = strtolower( $state['coupon_code'] );
        $order_coupons = $order->get_coupon_codes();

        foreach ( $order_coupons as $coupon ) {
            if ( strtolower( $coupon ) === $exit_coupon ) {
                $this->tracker->mark_converted( $order_id );
                break;
            }
        }
    }

    /**
     * Migrate guest state to user meta during conversion
     *
     * Called within maybe_mark_converted() when user_id exists.
     *
     * @param int $user_id User ID.
     * @return void
     */
    private function migrate_guest_to_user( int $user_id ): void {
        // Check if user already has state (don't overwrite)
        $existing = get_user_meta( $user_id, '_yayboost_exit_popup', true );
        if ( ! empty( $existing ) ) {
            return;
        }

        // Get guest token from cookie (sanitize properly)
        $guest_token = isset( $_COOKIE['yayboost_exit_popup_token'] )
            ? sanitize_text_field( wp_unslash( $_COOKIE['yayboost_exit_popup_token'] ) )
            : null;
        if ( ! $guest_token ) {
            return;
        }

        // Get guest state from transient (use md5 hash to match tracker key format)
        $transient_key = 'yayboost_exit_guest_' . md5( $guest_token );
        $guest_state   = get_transient( $transient_key );
        if ( ! $guest_state ) {
            return;
        }

        // Migrate to usermeta
        update_user_meta( $user_id, '_yayboost_exit_popup', $guest_state );

        // Cleanup guest transient
        delete_transient( $transient_key );
    }
}
