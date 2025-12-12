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
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        // Hook into appropriate locations based on show_on setting
        $settings = $this->get_settings();
        $show_on  = $settings['show_on'] ?? [ 'top_cart', 'top_checkout' ];

        // Map show_on values to WooCommerce hooks
        $hook_map = [
            'top_cart'        => 'woocommerce_before_cart',
            'bottom_cart'     => 'woocommerce_before_cart_collaterals',
            'top_checkout'    => 'woocommerce_before_checkout_form',
            'bottom_checkout' => 'woocommerce_after_checkout_form',
        ];

        foreach ($show_on as $location) {
            if (isset( $hook_map[ $location ] )) {
                add_action( $hook_map[ $location ], [ $this, 'render_bar' ] );
            }
        }

        // Mini cart: Support both widget (hook) and block (JavaScript)
        if (in_array( 'mini_cart', $show_on, true )) {
            // Method 1: Hook for widget-based mini cart
            add_action( 'woocommerce_before_mini_cart', [ $this, 'render_bar' ] );
            add_action( 'woocommerce_widget_shopping_cart_before_buttons', [ $this, 'render_bar' ] );
        }

        // Always register AJAX endpoints (can be called from anywhere)
        add_action( 'wp_ajax_yayboost_get_shipping_bar', [ $this, 'ajax_get_bar_data' ] );
        add_action( 'wp_ajax_nopriv_yayboost_get_shipping_bar', [ $this, 'ajax_get_bar_data' ] );

        // Enqueue assets only if feature is enabled and has locations
        if ( ! empty( $show_on ) ) {
            add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ], 100 );
        }
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        if ( ! $this->is_enabled()) {
            return;
        }

        $show_on = $this->get_settings()['show_on'] ?? [ 'top_cart', 'top_checkout' ];

        // Check if we should enqueue on current page
        $should_enqueue = in_array( 'mini_cart', $show_on, true )
            || (is_cart() && array_intersect( [ 'top_cart', 'bottom_cart' ], $show_on ))
            || (is_checkout() && array_intersect( [ 'top_checkout', 'bottom_checkout' ], $show_on ));

        if ( ! $should_enqueue) {
            return;
        }

        // Enqueue CSS file
        wp_enqueue_style(
            'yayboost-free-shipping-bar',
            YAYBOOST_URL . 'assets/css/free-shipping-bar.css',
            [],
            YAYBOOST_VERSION
        );

        // Add inline styles for dynamic colors
        wp_add_inline_style( 'yayboost-free-shipping-bar', $this->generate_custom_css( $this->get_settings() ) );

        wp_enqueue_script(
            'yayboost-free-shipping-bar',
            YAYBOOST_URL . 'assets/js/free-shipping-bar.js',
            [ 'jquery' ],
            YAYBOOST_VERSION,
            true
        );

        $settings = $this->get_settings();

        wp_localize_script(
            'yayboost-free-shipping-bar',
            'yayboostShippingBar',
            [
                'ajaxUrl'       => admin_url( 'admin-ajax.php' ),
                'nonce'         => wp_create_nonce( 'yayboost_shipping_bar' ),
                'thresholdInfo' => $this->get_threshold_info_for_js(),
                'templates'     => $this->get_html_templates(),
                'settings'      => [
                    'message_progress'   => $settings['message_progress'] ?? __( 'Add {remaining} more for free shipping!', 'yayboost' ),
                    'message_achieved'   => $settings['message_achieved'] ?? __( 'You have free shipping!', 'yayboost' ),
                    'message_coupon'     => $settings['message_coupon'] ?? __( 'Please enter coupon code to receive free shipping', 'yayboost' ),
                    'bar_color'          => $settings['bar_color'] ?? '#4CAF50',
                    'background_color'   => $settings['background_color'] ?? '#e8f5e9',
                    'text_color'         => $settings['text_color'] ?? '#2e7d32',
                    'display_style'      => $settings['display_style'] ?? 'minimal_text',
                    'currency_symbol'    => get_woocommerce_currency_symbol(),
                    'currency_position'  => get_option( 'woocommerce_currency_pos', 'left' ),
                    'decimals'           => wc_get_price_decimals(),
                    'decimal_separator'  => wc_get_price_decimal_separator(),
                    'thousand_separator' => wc_get_price_thousand_separator(),
                ],
            ]
        );
    }

    /**
     * Generate custom CSS for dynamic colors based on settings
     *
     * @param array $settings
     * @return string
     */
    protected function generate_custom_css(array $settings): string {
        $bar_color  = $settings['bar_color'] ?? '#4CAF50';
        $bg_color   = $settings['background_color'] ?? '#e0e0e0';
        $text_color = $settings['text_color'] ?? '#333333';
        $data       = $this->get_bar_data();
        $achieved   = $data['achieved'] && ! $data['show_coupon_message'];
        return "
            .yayboost-shipping-bar {
                background: {$bg_color};
                color: {$text_color};
            }
            .yayboost-shipping-bar__progress {
                background: {$bg_color};
            }
            .yayboost-shipping-bar__progress-fill {
                background: {$bar_color};
            }
            .yayboost-shipping-bar--achieved {
                background: {$bar_color};
            }
        ";
    }

    /**
     * Render the shipping bar
     *
     * @return void
     */
    public function render_bar(): void {
        echo wp_kses_post( $this->get_bar_html() );
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
                    <div class="yayboost-shipping-bar__progress" style="background-color: {{TEXT_COLOR}}20;">
                        <div class="yayboost-shipping-bar__progress-fill" 
                             style="width: {{PROGRESS}}%; background-color: {{PROGRESS_COLOR}};"></div>
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
                        <div class="yayboost-shipping-bar__progress" style="background-color: {{TEXT_COLOR}}20;">
                            <div class="yayboost-shipping-bar__progress-fill" 
                                 style="width: {{PROGRESS}}%; background-color: {{BAR_COLOR}};"></div>
                        </div>
                        <div class="yayboost-shipping-bar__progress-icon" style="background-color: {{BAR_COLOR}};">
                            <span style="color: #ffffff;">🎁</span>
                        </div>
                    </div>
                    <div class="yayboost-shipping-bar__cta" style="background-color: {{BG_COLOR}}; color: {{TEXT_COLOR}};">{{MESSAGE}}</div>
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
        $settings   = $this->get_settings();
        $templates  = $this->get_html_templates();
        $achieved   = $data['achieved'] && ! $data['show_coupon_message'];
        $bg_color   = $achieved ? $settings['bar_color'] : $settings['background_color'];
        $text_color = $achieved ? '#ffffff' : $settings['text_color'];

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
        $settings       = $this->get_settings();
        $templates      = $this->get_html_templates();
        $achieved       = $data['achieved'] && ! $data['show_coupon_message'];
        $progress_color = $achieved ? $settings['bar_color'] : $settings['background_color'];
        $text_color     = $settings['text_color'];

        $template = $templates['progress_bar'];

        return $this->replace_template_placeholders(
            $template,
            [
                'PROGRESS'       => esc_attr( $data['progress'] ),
                'PROGRESS_COLOR' => esc_attr( $progress_color ),
                'TEXT_COLOR'     => esc_attr( $text_color ),
                // PHP doesn't need barId for server-side rendering
                'ID_ATTR'        => '',
                'MESSAGE'        => wp_kses_post( $data['message'] ),
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
        $settings        = $this->get_settings();
        $templates       = $this->get_html_templates();
        $achieved        = $data['achieved'] && ! $data['show_coupon_message'];
        $bar_color       = $settings['bar_color'];
        $bg_color        = $achieved ? $settings['bar_color'] : $settings['background_color'];
        $text_color      = $settings['text_color'];
        $currency_symbol = get_woocommerce_currency_symbol();
        $threshold       = $data['threshold'] ?? 0;
        $cart_total      = $data['current'] ?? 0;

        $template = $templates['full_detail'];

        return $this->replace_template_placeholders(
            $template,
            [
                'BAR_COLOR'       => esc_attr( $bar_color ),
                'BG_COLOR'        => esc_attr( $bg_color ),
                'TEXT_COLOR'      => esc_attr( $text_color ),
                'PROGRESS'        => esc_attr( $data['progress'] ),
                'CURRENCY_SYMBOL' => esc_html( $currency_symbol ),
                'THRESHOLD'       => esc_html( number_format( $threshold, 2 ) ),
                'CART_TOTAL'      => esc_html( number_format( $cart_total, 2 ) ),
                // PHP doesn't need barId for server-side rendering
                'ID_ATTR'         => '',
                'MESSAGE'         => wp_kses_post( $data['message'] ),
            ]
        );
    }

    /**
     * Get bar HTML as string (for block injection)
     *
     * @return string
     */
    protected function get_bar_html(): string {
        $data = $this->get_bar_data();

        if ( ! $data) {
            return '';
        }

        $settings      = $this->get_settings();
        $display_style = $settings['display_style'] ?? 'minimal_text';

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
     * @return float Cart total
     */
    protected function calculate_cart_total_for_shipping(?string $ignore_discounts = 'no'): float {
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
        switch ($state) {
            case self::STATE_ACHIEVED:
                return $settings['message_achieved'] ?? __( 'You have free shipping!', 'yayboost' );

            case self::STATE_NEED_COUPON:
                return $settings['message_coupon'] ?? __( 'Please enter coupon code to receive free shipping', 'yayboost' );

            case self::STATE_IN_PROGRESS:
            default:
                return $this->format_message(
                    $settings['message_progress'] ?? __( 'Add {remaining} more for free shipping!', 'yayboost' ),
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
     * AJAX handler to get bar data
     *
     * @return void
     */
    public function ajax_get_bar_data(): void {
        // Verify nonce for security
        if ( ! isset( $_POST['nonce'] ) || ! wp_verify_nonce( $_POST['nonce'], 'yayboost_shipping_bar' )) {
            wp_send_json_error( [ 'message' => __( 'Security check failed', 'yayboost' ) ] );
            return;
        }

        $data = $this->get_bar_data();
        wp_send_json_success( $data );
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
                'threshold'         => 50,
                'message_progress'  => __( 'Add {remaining} more for free shipping!', 'yayboost' ),
                'message_achieved'  => __( '🎉 Congratulations! You have free shipping!', 'yayboost' ),
                'message_coupon'    => __( 'Please enter coupon code to receive free shipping', 'yayboost' ),
                'bar_color'         => '#4CAF50',
                'background_color'  => '#e8f5e9',
                'text_color'        => '#2e7d32',
                'show_on'           => [ 'top_cart', 'top_checkout' ],
                'show_progress_bar' => true,
                'display_style'     => 'minimal_text',
            ]
        );
    }
}
