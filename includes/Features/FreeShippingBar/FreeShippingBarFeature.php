<?php
/**
 * Free Shipping Bar Feature
 *
 * Displays a progress bar encouraging customers to add more items
 * to qualify for free shipping.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FreeShippingBar;

use YayBoost\Features\AbstractFeature;
use YayBoost\Analytics\AnalyticsTracker;
use YayBoost\Shared\DisplayPosition\DisplayPositionService;

/**
 * Free Shipping Bar feature implementation
 */
class FreeShippingBarFeature extends AbstractFeature {
    /**
     * Bar state: Free shipping achieved
     */
    const STATE_ACHIEVED = 'achieved';

    /**
     * Bar state: Need coupon to get free shipping
     */
    const STATE_NEED_COUPON = 'need_coupon';

    /**
     * Bar state: In progress (not yet achieved)
     */
    const STATE_IN_PROGRESS = 'in_progress';

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'free_shipping_bar';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Free Shipping Bar';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display a progress bar to encourage customers to reach free shipping threshold';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'cart_optimizer';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'truck';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 1;

    /**
     * Track if impression already logged this request
     *
     * @var bool
     */
    private static $impression_logged = false;

    /**
     * Display position service
     *
     * @var DisplayPositionService
     */
    private DisplayPositionService $position_service;

    /**
     * Allowed positions for cart page
     *
     * @var array
     */
    protected array $cart_positions = [
        'before_cart_table',
        'after_cart_table',
    ];

    /**
     * Allowed positions for checkout page
     *
     * @var array
     */
    protected array $checkout_positions = [
        'before_checkout_form',
        'after_checkout_form',
    ];

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        $this->position_service = new DisplayPositionService();
        $this->register_display_hooks();

        // Add cart fragments filter for Classic Cart/Mini Cart updates
        add_filter( 'woocommerce_add_to_cart_fragments', [ $this, 'add_shipping_bar_fragment' ] );

        if ( $this->is_enabled() ) {
            new FreeShippingBarBlock( $this );
            new FreeShippingBarSlotFill( $this );
        }
    }

    /**
     * Register display hooks based on settings
     *
     * @return void
     */
    protected function register_display_hooks(): void {
        if ( ! $this->is_enabled() ) {
            return;
        }

        $display_positions = $this->get( 'display_positions', [] );

        // Register cart and checkout page hooks via DisplayPositionService
        $this->position_service->register_multi_page_hooks(
            $display_positions,
            [ $this, 'render_bar' ]
        );

        // Mini cart: Support both widget (hook) and block (JavaScript)
        if ( $this->get( 'show_on_mini_cart', false ) ) {
            add_action( 'woocommerce_before_mini_cart', [ $this, 'render_bar' ] );
            add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_styles' ] );
        }
    }

    /**
     * Get position options for cart page admin UI
     *
     * @return array Options array with value/label pairs.
     */
    public function get_cart_position_options(): array {
        return $this->position_service->get_options_for_select(
            DisplayPositionService::PAGE_CART,
            $this->cart_positions
        );
    }

    /**
     * Get position options for checkout page admin UI
     *
     * @return array Options array with value/label pairs.
     */
    public function get_checkout_position_options(): array {
        return $this->position_service->get_options_for_select(
            DisplayPositionService::PAGE_CHECKOUT,
            $this->checkout_positions
        );
    }

    /**
     * Get localization data for JavaScript
     * Shared method used by both classic feature and block
     *
     * @return array Localization data array
     */
    public function get_localization_data(): array {
        $settings = $this->get_settings();

        // Get applied coupon codes and their free shipping status
        // This helps JavaScript verify free shipping coupons more accurately
        // Optimized: Only get applied coupon codes (fast, no object creation)
        $applied_coupons_data = [];
        if ( WC()->cart ) {
            // Only get applied coupon codes (fast, no object creation)
            $applied_codes = WC()->cart->get_applied_coupons();

            foreach ( $applied_codes as $code ) {
                // Get coupon ID from code
                $coupon_id = wc_get_coupon_id_by_code( $code );

                if ( $coupon_id ) {
                    // Check free_shipping directly from post meta (no object creation)
                    $free_shipping = 'yes' === get_post_meta( $coupon_id, 'free_shipping', true );

                    $applied_coupons_data[ $code ] = [
                        'code'          => $code,
                        'free_shipping' => $free_shipping,
                    ];
                }
            }
        }

        return [
            'ajaxUrl'        => admin_url( 'admin-ajax.php' ),
            'nonce'          => wp_create_nonce( 'yayboost_shipping_bar' ),
            'cartTotal'      => $this->calculate_cart_total_for_shipping( $this->get_free_shipping_info()['ignore_discounts'] ?? 'no' ),
            'thresholdInfo'  => $this->get_threshold_info_for_js(),
            'templates'      => $this->get_html_templates(),
            'settingsHash'   => $this->get_settings_hash(),
            'appliedCoupons' => $applied_coupons_data,
            'settings'       => [
                'messageProgress' => $settings['message_progress'],
                'messageAchieved' => $settings['message_achieved'],
                'messageCoupon'   => $settings['message_coupon'],
                'primaryColor'    => $settings['primary_color'],
                'displayStyle'    => $settings['display_style'],
                'shopPageUrl'     => function_exists( 'wc_get_page_id' ) ? get_permalink( wc_get_page_id( 'shop' ) ) : '', // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
            ],
        ];
    }

    public function enqueue_styles(): void {
        if ( ! wp_style_is( 'yayboost-free-shipping-bar-style', 'enqueued' ) ) {
            wp_enqueue_style(
                'yayboost-free-shipping-bar',
                YAYBOOST_URL . 'assets/dist/blocks/free-shipping-bar/style-index.css',
                [],
                YAYBOOST_VERSION
            );
        }
    }

    /**
     * Render the shipping bar
     *
     * @return void
     */
    public function render_bar(): void {

        if ( ! $this->is_enabled() ) {
            return;
        }

        // Enqueue CSS file, make sure style from block not enqueued
        $this->enqueue_styles();

        $bar_html = $this->get_bar_html();

        if ( ! empty( $bar_html ) ) {
            // Track impression (once per request)
            $this->track_impression();

            echo $bar_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        }
    }

    /**
     * Track impression for analytics
     *
     * @return void
     */
    private function track_impression(): void {
        // Prevent duplicate tracking within same request
        if ( self::$impression_logged ) {
            return;
        }

        // Don't track in admin or AJAX requests (fragments)
        if ( is_admin() || wp_doing_ajax() ) {
            return;
        }

        self::$impression_logged = true;

        $bar_data = $this->get_bar_data();
        $metadata = [
            'threshold' => $bar_data['threshold'] ?? 0,
            'current'   => $bar_data['current'] ?? 0,
            'state'     => $bar_data['achieved'] ? 'achieved' : 'in_progress',
        ];

        AnalyticsTracker::impression(
            AnalyticsTracker::FEATURE_FREE_SHIPPING,
            0, // No specific product for this feature
            $metadata
        );
    }

    /**
     * Get HTML templates with placeholders
     *
     * @return array Templates array with placeholders
     */
    protected function get_html_templates(): array {
        return [
            'minimal_text' => '
                <div class="yayboost-shipping-bar yayboost-shipping-bar--minimal-text{{ACHIEVED_CLASS}}" 
                     style="background-color: {{BG_COLOR}}; color: {{TEXT_COLOR}};"{{ID_ATTR}}>
                    <div class="yayboost-shipping-bar__icon" style="color: {{TEXT_COLOR}};">🚚</div>
                    <div class="yayboost-shipping-bar__message">{{MESSAGE}}</div>
                </div>
            ',
            'progress_bar' => '
                <div class="yayboost-shipping-bar yayboost-shipping-bar--progress-bar"{{ID_ATTR}} style="background:none">
                    <div class="yayboost-shipping-bar__progress" style="background-color: {{BACKGROUND_COLOR}};">
                        <div class="yayboost-shipping-bar__progress-fill" 
                             style="width: {{PROGRESS}}%; background-color: {{BAR_COLOR}};"></div>
                    </div>
                    <div class="yayboost-shipping-bar__message" style="color: {{TEXT_COLOR}}; text-align: center;">{{MESSAGE}}</div>
                </div>
            ',
            'full_detail'  => '
                <div class="yayboost-shipping-bar yayboost-shipping-bar--full-detail"{{ID_ATTR}}>
                    <div class="yayboost-shipping-bar__header">
                        <div class="yayboost-shipping-bar__header-left">
                            <div class="yayboost-shipping-bar__icon-circle" style="background-color: {{BAR_COLOR}};">
                                <span style="color: #ffffff;">🚚</span>
                            </div>
                            <div class="yayboost-shipping-bar__info">
                                <div class="yayboost-shipping-bar__title" style="color: {{TEXT_COLOR}};">Free Shipping</div>
                                <div class="yayboost-shipping-bar__subtitle" style="color: {{TEXT_COLOR}};">On orders over {{CURRENCY_SYMBOL}}{{THRESHOLD}}</div>
                            </div>
                        </div>
                        <div class="yayboost-shipping-bar__header-right">
                            <div class="yayboost-shipping-bar__cart-total" style="color: {{TEXT_COLOR}};">{{CURRENCY_SYMBOL}}{{CART_TOTAL}}</div>
                            <div class="yayboost-shipping-bar__cart-label" style="color: {{TEXT_COLOR}};">Cart total</div>
                        </div>
                    </div>
                    <div class="yayboost-shipping-bar__progress-section">
                        <div class="yayboost-shipping-bar__progress" style="background-color: {{BACKGROUND_COLOR}};">
                            <div class="yayboost-shipping-bar__progress-fill" 
                                 style="width: {{PROGRESS}}%; background-color: {{BAR_COLOR}};"></div>
                        </div>
                        <div class="yayboost-shipping-bar__progress-icon" style="background-color: {{PROGRESS_ICON_BG}};">
                            <span style="color: #ffffff;">🎁</span>
                        </div>
                    </div>
                    <a class="yayboost-shipping-bar__cta" style="text-decoration: none; background-color: {{BG_COLOR}}; color: {{CTA_TEXT_COLOR}};" href="{{CTA_URL}}">{{MESSAGE}}</a>
                </div>
            ',
        ];
    }

    /**
     * Replace placeholders in template string
     *
     * @param string $template Template string with {{PLACEHOLDER}} placeholders.
     * @param array  $replacements Array of placeholder => value pairs.
     * @return string HTML string with replaced values
     */
    protected function replace_template_placeholders(string $template, array $replacements): string {
        $html = $template;

        // Replace all placeholders
        foreach ($replacements as $key => $value) {
            $placeholder = '{{' . $key . '}}';
            $html        = str_replace( $placeholder, $value, $html );
        }

        // Remove any remaining placeholders (optional - for safety)
        $html = preg_replace( '/\{\{[\w_]+\}\}/', '', $html );

        return trim( $html );
    }

    /**
     * Build minimal text HTML
     *
     * @param array $data Bar data array.
     * @return string HTML string
     */
    protected function build_minimal_text_html(array $data): string {
        $templates     = $this->get_html_templates();
        $achieved      = $data['achieved'] && ! $data['show_coupon_message'];
        $primary_color = $this->get('primary_color');
        $bg_color      = $achieved ? $primary_color : $this->apply_opacity( $primary_color );
        $text_color    = $achieved ? '#ffffff' : $primary_color;

        $template = $templates['minimal_text'];

        return $this->replace_template_placeholders(
            $template,
            [
                'ACHIEVED_CLASS' => $achieved ? ' yayboost-shipping-bar--achieved' : '',
                'BG_COLOR'       => esc_attr( $bg_color ),
                'TEXT_COLOR'     => esc_attr( $text_color ),
                // PHP doesn't need barId for server-side rendering
                'ID_ATTR'        => '',
                'MESSAGE'        => wp_kses_post( $data['message'] ),
            ]
        );
    }

    /**
     * Build progress bar HTML
     *
     * @param array $data Bar data array.
     * @return string HTML string
     */
    protected function build_progress_bar_html(array $data): string {
        $templates        = $this->get_html_templates();
        $primary_color    = $this->get('primary_color');
        $bar_color        = $primary_color;
        $background_color = $this->apply_opacity( $primary_color );
        $text_color       = $primary_color;

        $template = $templates['progress_bar'];

        return $this->replace_template_placeholders(
            $template,
            [
                'PROGRESS'         => esc_attr( $data['progress'] ),
                'BAR_COLOR'        => esc_attr( $bar_color ),
                'BACKGROUND_COLOR' => esc_attr( $background_color ),
                'TEXT_COLOR'       => esc_attr( $text_color ),
                // PHP doesn't need barId for server-side rendering
                'ID_ATTR'          => '',
                'MESSAGE'          => wp_kses_post( $data['message'] ),
            ]
        );
    }

    /**
     * Build full detail HTML
     *
     * @param array $data Bar data array.
     * @return string HTML string
     */
    protected function build_full_detail_html(array $data): string {
        $templates        = $this->get_html_templates();
        $achieved         = $data['achieved'] && ! $data['show_coupon_message'];
        $primary_color    = $this->get('primary_color');
        $bar_color        = $primary_color;
        $background_color = $this->apply_opacity( $primary_color );
        $bg_color         = $achieved ? $primary_color : $background_color;
        $progress_icon_bg = $achieved ? $primary_color : $background_color;
        $text_color       = $primary_color;
        $currency_symbol  = get_woocommerce_currency_symbol();
        $threshold        = $data['threshold'] ?? 0;
        $cart_total       = $data['current'] ?? 0;

        $template      = $templates['full_detail'];
        $shop_page_url = get_permalink( wc_get_page_id( 'shop' ) );

        return $this->replace_template_placeholders(
            $template,
            [
                'BAR_COLOR'        => esc_attr( $bar_color ),
                'BACKGROUND_COLOR' => esc_attr( $background_color ),
                'BG_COLOR'         => esc_attr( $bg_color ),
                'PROGRESS_ICON_BG' => esc_attr( $progress_icon_bg ),
                'TEXT_COLOR'       => esc_attr( $text_color ),
                'CTA_TEXT_COLOR'   => $achieved ? '#ffffff' : esc_attr( $text_color ),
                'PROGRESS'         => esc_attr( $data['progress'] ),
                'CURRENCY_SYMBOL'  => esc_html( $currency_symbol ),
                'THRESHOLD'        => wc_price( $threshold ),
                'CART_TOTAL'       => wc_price( $cart_total ),
                'CTA_URL'          => ! $achieved ? esc_url( $shop_page_url ) : 'javascript:void(0)',
                // PHP doesn't need barId for server-side rendering
                'ID_ATTR'          => '',
                'MESSAGE'          => wp_kses_post( $data['message'] ),
            ]
        );
    }

    /**
     * Get bar HTML as string (for block injection)
     *
     * @param array|null $data Optional data array. If not provided, will fetch from cart.
     * @return string
     */
    public function get_bar_html( ?array $data = null ): string {
        // If data is not provided, fetch from cart (default behavior)
        if ( $data === null ) {
            $data = $this->get_bar_data();
        }

        if ( ! $data ) {
            return '';
        }

        $display_style = $this->get('display_style');

        // Route to appropriate method based on display style
        if ($display_style === 'minimal_text') {
            return $this->build_minimal_text_html( $data );
        } elseif ($display_style === 'progress_bar') {
            return $this->build_progress_bar_html( $data );
        } elseif ($display_style === 'full_detail') {
            return $this->build_full_detail_html( $data );
        }

        // Fallback to minimal_text
        return $this->build_minimal_text_html( $data );
    }

    /**
     * Check if cart has a valid free shipping coupon applied
     *
     * @return bool
     */
    protected function has_free_shipping_coupon(): bool {
        if ( ! WC()->cart) {
            return false;
        }

        $coupons = WC()->cart->get_coupons();

        if (empty( $coupons )) {
            return false;
        }

        foreach ($coupons as $code => $coupon) {
            if ($coupon->is_valid() && $coupon->get_free_shipping()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get free shipping methods info from WooCommerce shipping zones
     *
     * @return array|null Returns array with free shipping info or null if not found
     */
    protected function get_free_shipping_info(): ?array {
        if ( ! WC()->cart || ! WC()->shipping()) {
            return null;
        }

        // Get shipping packages from cart (not from calculated shipping)
        // This works even if shipping hasn't been calculated yet (e.g., in AJAX requests)
        $packages = WC()->cart->get_shipping_packages();

        if (empty( $packages )) {
            return null;
        }

        $min_amounts        = [];
        $requires_coupon    = false;
        $has_no_requirement = false;
        // Store the actual requires value: '' | 'coupon' | 'min_amount' | 'either' | 'both'
        $requires_type = null;
        // Default: apply minimum order rule after coupon discount
        $ignore_discounts = 'no';

        foreach ($packages as $package) {
            // Get matching shipping zone
            $zone = \WC_Shipping_Zones::get_zone_matching_package( $package );

            if ( ! $zone) {
                continue;
            }

            // Get all enabled shipping methods from zone
            $methods = $zone->get_shipping_methods( true );
            // true = enabled only

            foreach ($methods as $method) {
                if ($method->id !== 'free_shipping' || $method->enabled !== 'yes') {
                    continue;
                }

                $requires = $method->requires ?? '';

                // Get ignore_discounts setting (use first found, or 'yes' if any method has it)
                $method_ignore_discounts = $method->ignore_discounts ?? 'no';
                if ($method_ignore_discounts === 'yes') {
                    $ignore_discounts = 'yes';
                }

                // Check if no requirement (free shipping already available)
                if ($requires === '') {
                    $has_no_requirement = true;
                    $requires_type      = '';
                    continue;
                }

                // Store the requires type (use the first one found, or 'either'/'both' if multiple)
                if ($requires_type === null) {
                    $requires_type = $requires;
                } elseif ($requires_type !== $requires) {
                    // If multiple methods with different requires, prioritize 'both' > 'either' > others
                    if ($requires === 'both' || ($requires === 'either' && $requires_type !== 'both')) {
                        $requires_type = $requires;
                    }
                }

                // Check if requires coupon
                if (in_array( $requires, [ 'coupon', 'either', 'both' ], true )) {
                    $requires_coupon = true;
                }

                // Collect min_amount from methods that require it
                if (in_array( $requires, [ 'min_amount', 'either', 'both' ], true )) {
                    $min_amount = (float) ($method->min_amount ?? 0);
                    if ($min_amount > 0) {
                        $min_amounts[] = $min_amount;
                    }
                }
            }//end foreach
        }//end foreach

        // If no requirement found, free shipping is already available
        if ($has_no_requirement && empty( $min_amounts ) && ! $requires_coupon) {
            return null;
        }

        // Get lowest min_amount if multiple exist
        $min_amount = ! empty( $min_amounts ) ? min( $min_amounts ) : null;

        // Check if cart has free shipping coupon
        $has_coupon = $this->has_free_shipping_coupon();

        return [
            'min_amount'               => $min_amount,
            'requires_coupon'          => $requires_coupon,
            'requires_type'            => $requires_type,
            'ignore_discounts'         => $ignore_discounts,
            'has_free_shipping_coupon' => $has_coupon,
        ];
    }

    /**
     * Calculate progress data for shipping bar
     *
     * @param float $threshold Minimum amount threshold.
     * @param float $cart_total Current cart total.
     * @return array Progress data array
     */
    protected function calculate_progress(float $threshold, float $cart_total): array {
        $remaining = $threshold - $cart_total;
        $achieved  = $cart_total >= $threshold;
        $progress  = $threshold > 0 ? min( 100, ($cart_total / $threshold) * 100 ) : 100;

        return [
            'remaining' => max( 0, $remaining ),
            'achieved'  => $achieved,
            'progress'  => round( $progress, 2 ),
        ];
    }

    /**
     * Format message with placeholders
     *
     * @param string $template Message template.
     * @param float  $remaining Remaining amount.
     * @param float  $threshold Threshold amount.
     * @param float  $current Current cart total.
     * @return string Formatted message
     */
    protected function format_message(string $template, float $remaining, float $threshold, float $current): string {
        return str_replace(
            [ '{remaining}', '{threshold}', '{current}' ],
            [ wc_price( $remaining ), wc_price( $threshold ), wc_price( $current ) ],
            $template
        );
    }

    /**
     * Calculate cart total the same way WooCommerce Free Shipping method does
     *
     * @param string|null $ignore_discounts 'yes' to ignore discounts, 'no' to apply after discount.
     * @return float|null Cart total or null if cart is not available
     */
    protected function calculate_cart_total_for_shipping(?string $ignore_discounts = 'no'): ?float {
        if ( ! WC()->cart) {
            return null;
        }

        // Use displayed subtotal (same as WooCommerce)
        $total = (float) WC()->cart->get_displayed_subtotal();

        // If ignore_discounts is 'no' (default), subtract discount
        if ($ignore_discounts !== 'yes') {
            $total = $total - (float) WC()->cart->get_discount_total();
            if (WC()->cart->display_prices_including_tax()) {
                $total = $total - (float) WC()->cart->get_discount_tax();
            }
        }

        // Round to match WooCommerce behavior
        return round( $total, wc_get_price_decimals() );
    }

    /**
     * Get bar data based on cart contents
     *
     * @return array|null
     */
    public function get_bar_data(): ?array {
        if ( ! WC()->cart) {
            return null;
        }

        $settings           = $this->get_settings();
        $free_shipping_info = $this->get_free_shipping_info();

        if ($free_shipping_info === null) {
            return null;
        }

        $min_amount       = $free_shipping_info['min_amount'];
        $requires_type    = $free_shipping_info['requires_type'] ?? null;
        $ignore_discounts = $free_shipping_info['ignore_discounts'] ?? 'no';
        $has_coupon       = $free_shipping_info['has_free_shipping_coupon'];

        // Must have min_amount to show bar
        if ($min_amount === null) {
            return null;
        }

        // Calculate cart total the same way WooCommerce does
        $cart_total    = $this->calculate_cart_total_for_shipping( $ignore_discounts );
        $progress_data = $this->calculate_progress( $min_amount, $cart_total );

        // Determine state
        $state = $this->determine_bar_state(
            $progress_data['achieved'],
            $requires_type,
            $has_coupon
        );

        // Build message based on state
        $message = $this->build_message( $state, $settings, $progress_data, $min_amount, $cart_total );

        // Build return data
        return $this->build_bar_response(
            $min_amount,
            $cart_total,
            $progress_data,
            $message,
            $state
        );
    }

    /**
     * Determine bar state based on progress and coupon requirements
     *
     * @param bool   $achieved Whether threshold is achieved.
     * @param string $requires_type The requires type: '' | 'coupon' | 'min_amount' | 'either' | 'both'.
     * @param bool   $has_coupon Whether coupon is applied.
     * @return string 'achieved'|'need_coupon'|'in_progress'
     */
    protected function determine_bar_state(bool $achieved, ?string $requires_type, bool $has_coupon): string {
        // Case 1: No requirement - free shipping always available (shouldn't show bar)
        if ($requires_type === '') {
            return self::STATE_ACHIEVED;
        }

        // Case 2: Only coupon required (no min_amount) - shouldn't show bar, but handle gracefully
        if ($requires_type === 'coupon') {
            return $has_coupon ? self::STATE_ACHIEVED : self::STATE_NEED_COUPON;
        }

        // Case 3: Only min_amount required
        if ($requires_type === 'min_amount') {
            return $achieved ? self::STATE_ACHIEVED : self::STATE_IN_PROGRESS;
        }

        // Case 4: Either min_amount OR coupon (either)
        if ($requires_type === 'either') {
            // Achieved if: has coupon OR achieved min_amount
            if ($has_coupon || $achieved) {
                return self::STATE_ACHIEVED;
            }
            // If achieved min_amount but no coupon, still achieved (OR logic)
            return self::STATE_IN_PROGRESS;
        }

        // Case 5: Both min_amount AND coupon (both)
        if ($requires_type === 'both') {
            // Achieved only if: has coupon AND achieved min_amount
            if ($has_coupon && $achieved) {
                return self::STATE_ACHIEVED;
            }
            // If achieved min_amount but no coupon, need coupon
            if ($achieved && ! $has_coupon) {
                return self::STATE_NEED_COUPON;
            }
            // Otherwise, still in progress
            return self::STATE_IN_PROGRESS;
        }

        // Fallback: treat as min_amount only
        return $achieved ? self::STATE_ACHIEVED : self::STATE_IN_PROGRESS;
    }

    /**
     * Build message based on state
     *
     * @param string $state Bar state.
     * @param array  $settings Settings array.
     * @param array  $progress_data Progress data.
     * @param float  $threshold Threshold amount.
     * @param float  $cart_total Cart total.
     * @return string Formatted message
     */
    protected function build_message(string $state, array $settings, array $progress_data, float $threshold, float $cart_total): string {
        $default_settings = $this->get_default_settings();
        switch ($state) {
            case self::STATE_ACHIEVED:
                return $settings['message_achieved'] ? $settings['message_achieved'] : $default_settings['message_achieved'];

            case self::STATE_NEED_COUPON:
                return $settings['message_coupon'] ? $settings['message_coupon'] : $default_settings['message_coupon'];

            case self::STATE_IN_PROGRESS:
            default:
                return $this->format_message(
                    $settings['message_progress'] ? $settings['message_progress'] : $default_settings['message_progress'],
                    $progress_data['remaining'],
                    $threshold,
                    $cart_total
                );
        }
    }

    /**
     * Build bar response data
     *
     * @param float  $threshold Threshold amount.
     * @param float  $cart_total Cart total.
     * @param array  $progress_data Progress data.
     * @param string $message Message to display.
     * @param string $state Bar state.
     * @return array Bar data array
     */
    protected function build_bar_response(float $threshold, float $cart_total, array $progress_data, string $message, string $state): array {
        // Track threshold reached (once per session when state becomes achieved)
        if ( $state === self::STATE_ACHIEVED ) {
            $this->track_threshold_reached( $threshold, $cart_total );
        }

        return [
            'threshold'           => $threshold,
            'current'             => $cart_total,
            'remaining'           => $state === self::STATE_ACHIEVED ? 0 : $progress_data['remaining'],
            'progress'            => $state === self::STATE_ACHIEVED ? 100 : $progress_data['progress'],
            'achieved'            => $state === self::STATE_ACHIEVED,
            'message'             => $message,
            'show_coupon_message' => $state === self::STATE_NEED_COUPON,
        ];
    }

    /**
     * Track when user reaches free shipping threshold
     *
     * Uses transient to prevent duplicate tracking within same session.
     *
     * @param float $threshold Threshold amount.
     * @param float $cart_total Cart total.
     * @return void
     */
    private function track_threshold_reached( float $threshold, float $cart_total ): void {
        // Don't track in admin or AJAX (let page load track it)
        if ( is_admin() || wp_doing_ajax() ) {
            return;
        }

        // Use session-based tracking to prevent duplicates
        $session_key = 'yayboost_fsb_achieved_' . md5( WC()->session->get_customer_id() . '_' . $threshold );
        $already_tracked = get_transient( $session_key );

        if ( $already_tracked ) {
            return;
        }

        // Mark as tracked for 1 hour (typical session length)
        set_transient( $session_key, time(), HOUR_IN_SECONDS );

        // Log the conversion event
        AnalyticsTracker::log(
            AnalyticsTracker::FEATURE_FREE_SHIPPING,
            'threshold_reached',
            [
                'product_id' => 0,
                'revenue'    => $cart_total,
                'metadata'   => [
                    'threshold'  => $threshold,
                    'cart_total' => $cart_total,
                    'exceeded'   => $cart_total - $threshold,
                ],
            ]
        );
    }

    /**
     * Get threshold info for JavaScript (no cart total needed)
     *
     * @return array|null
     */
    protected function get_threshold_info_for_js(): ?array {
        if ( ! WC()->cart) {
            return null;
        }

        $free_shipping_info = $this->get_free_shipping_info();

        // If no free shipping methods found, don't show bar
        if ($free_shipping_info === null) {
            return null;
        }

        $min_amount      = $free_shipping_info['min_amount'];
        $requires_coupon = $free_shipping_info['requires_coupon'];
        $requires_type   = $free_shipping_info['requires_type'] ?? null;

        // Case 1: Only coupon required (no min_amount) - don't show bar
        if ($requires_coupon && $min_amount === null) {
            return null;
        }

        // Must have min_amount to show bar
        if ($min_amount === null) {
            return null;
        }

        return [
            'min_amount'       => $min_amount,
            'requires_coupon'  => $requires_coupon,
            'requires_type'    => $requires_type,
            'ignore_discounts' => $free_shipping_info['ignore_discounts'] ?? 'no',
        ];
    }

    /**
     * Add shipping bar fragment to cart fragments (for Classic Cart/Mini Cart)
     *
     * @param array $fragments Fragments array.
     * @return array Updated fragments.
     */
    public function add_shipping_bar_fragment(array $fragments): array {
        // Only add fragment if feature is enabled
        if ( ! $this->is_enabled()) {
            return $fragments;
        }

        // Check if cart is empty
        if ( ! WC()->cart || WC()->cart->is_empty()) {
            // Remove bar if cart empty
            $fragments['.yayboost-shipping-bar'] = '';
            return $fragments;
        }

        // Get updated bar HTML with latest cart data
        $bar_html = $this->get_bar_html();

        if (empty( $bar_html )) {
            // No bar data, remove existing bar
            $fragments['.yayboost-shipping-bar'] = '';
            return $fragments;
        }

        // Add fragment - WooCommerce will automatically replace HTML
        $fragments['.yayboost-shipping-bar'] = $bar_html;

        return $fragments;
    }

    /**
     * Convert hex color to rgba with opacity
     *
     * @param string $hex Hex color code (e.g., '#4CAF50').
     * @param float  $opacity Opacity value (0.0 to 1.0).
     * @return string RGBA color string
     */
    public function apply_opacity(string $hex, float $opacity = 0.75): string {
        $hex = ltrim( $hex, '#' );
    
        // Handle shorthand hex (#fff)
        if ( strlen( $hex ) === 3 ) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        
        $r = hexdec( substr( $hex, 0, 2 ) );
        $g = hexdec( substr( $hex, 2, 2 ) );
        $b = hexdec( substr( $hex, 4, 2 ) );
        
        // Blend with white
        $r = round( $r + ( 255 - $r ) * $opacity );
        $g = round( $g + ( 255 - $g ) * $opacity );
        $b = round( $b + ( 255 - $b ) * $opacity );
        
        return sprintf( '#%02x%02x%02x', $r, $g, $b );
    }

    /**
     * Get hash of current settings for cache invalidation
     * Used to detect when settings have changed and clear browser cache
     *
     * @return string MD5 hash of settings that affect display
     */
    protected function get_settings_hash(): string {
        $settings = $this->get_settings();
        // Only hash settings that affect display
        $relevant_settings = [
            'message_progress' => $settings['message_progress'] ?? '',
            'message_achieved' => $settings['message_achieved'] ?? '',
            'message_coupon'   => $settings['message_coupon'] ?? '',
            'primary_color'    => $settings['primary_color'] ?? '',
            'display_style'    => $settings['display_style'] ?? '',
        ];
        return md5( wp_json_encode( $relevant_settings ) );
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
                'enabled'            => true,
                'message_progress'   => __( 'Add {remaining} more for free shipping!', 'yayboost' ),
                'message_achieved'   => __( '🎉 Congratulations! You have free shipping!', 'yayboost' ),
                'message_coupon'     => __( 'Please enter coupon code to receive free shipping', 'yayboost' ),
                'primary_color'      => '#4CAF50',
                'display_positions'  => [
                    'cart'     => [ 'before_cart_table' ],
                    'checkout' => [ 'before_checkout_form' ],
                ],
                'show_on_mini_cart'  => false,
                'show_progress_bar'  => true,
                'display_style'      => 'minimal_text',
            ]
        );
    }
}
