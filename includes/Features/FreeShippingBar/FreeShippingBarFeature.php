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

        wp_localize_script(
            'yayboost-free-shipping-bar',
            'yayboostShippingBar',
            [
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                'nonce'   => wp_create_nonce( 'yayboost_shipping_bar' ),
            ]
        );
    }

    /**
     * Generate custom CSS based on settings
     *
     * @param array $settings
     * @return string
     */
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
     * Get bar HTML as string (for block injection)
     *
     * @return string
     */
    protected function get_bar_html(): string {
        $data = $this->get_bar_data();

        if ( ! $data) {
            return '';
        }

        // Determine if we should show achieved styling (only when fully achieved, not when coupon needed)
        $achieved_class = $data['achieved'] && ! $data['show_coupon_message'] ? ' yayboost-shipping-bar--achieved' : '';

        // Show progress bar only when threshold exists, not achieved, and not showing coupon message
        $show_progress = isset( $data['threshold'] ) && $data['threshold'] > 0 && ! $data['achieved'] && ! $data['show_coupon_message'];

        ob_start();
        ?>
        <div class="yayboost-shipping-bar<?php echo esc_attr( $achieved_class ); ?>">
            <div class="yayboost-shipping-bar__message">
                <?php echo wp_kses_post( $data['message'] ); ?>
            </div>
            <?php if ($show_progress) : ?>
                <div class="yayboost-shipping-bar__progress">
                    <div
                        class="yayboost-shipping-bar__progress-fill"
                        style="width: <?php echo esc_attr( $data['progress'] ); ?>%"
                    ></div>
                </div>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
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
        $requires_both      = false;
        $has_no_requirement = false;

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

                // Check if no requirement (free shipping already available)
                if ($requires === '') {
                    $has_no_requirement = true;
                    continue;
                }

                // Check if requires coupon
                if (in_array( $requires, [ 'coupon', 'either', 'both' ], true )) {
                    $requires_coupon = true;
                }

                // Check if requires both min_amount AND coupon
                if ($requires === 'both') {
                    $requires_both = true;
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
            'requires_both'            => $requires_both,
            'has_free_shipping_coupon' => $has_coupon,
        ];
    }

    /**
     * Calculate progress data for shipping bar
     *
     * @param float $threshold Minimum amount threshold
     * @param float $cart_total Current cart total
     * @return array
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
     * @param string $template Message template
     * @param float  $remaining Remaining amount
     * @param float  $threshold Threshold amount
     * @param float  $current Current cart total
     * @return string
     */
    protected function format_message(string $template, float $remaining, float $threshold, float $current): string {
        return str_replace(
            [ '{remaining}', '{threshold}', '{current}' ],
            [ wc_price( $remaining ), wc_price( $threshold ), wc_price( $current ) ],
            $template
        );
    }

    /**
     * Get bar data based on cart contents
     *
     * @param float|null $cart_total_override Optional cart total override from batch API (for mini cart block)
     * @return array|null
     */
    public function get_bar_data(?float $cart_total_override = null): ?array {
        if ( ! WC()->cart) {
            return null;
        }

        $settings           = $this->get_settings();
        $free_shipping_info = $this->get_free_shipping_info();

        // If no free shipping methods found, don't show bar
        if ($free_shipping_info === null) {
            return null;
        }

        $min_amount      = $free_shipping_info['min_amount'];
        $requires_coupon = $free_shipping_info['requires_coupon'];
        $has_coupon      = $free_shipping_info['has_free_shipping_coupon'];

        // Use override from batch API if provided (mini cart block), otherwise get from cart
        $cart_total = $cart_total_override !== null
            ? $cart_total_override
            : (float) WC()->cart->get_subtotal();

        // Case 1: Only coupon required (no min_amount) - don't show bar
        if ($requires_coupon && $min_amount === null) {
            return null;
        }

        // Must have min_amount to show bar
        if ($min_amount === null) {
            return null;
        }

        $threshold     = $min_amount;
        $progress_data = $this->calculate_progress( $threshold, $cart_total );
        $remaining     = $progress_data['remaining'];
        $achieved      = $progress_data['achieved'];
        $progress      = $progress_data['progress'];

        // Case 2: Only min_amount required
        if ( ! $requires_coupon) {
            $message = $achieved
                ? ($settings['message_achieved'] ?? __( 'You have free shipping!', 'yayboost' ))
                : $this->format_message(
                    $settings['message_progress'] ?? __( 'Add {remaining} more for free shipping!', 'yayboost' ),
                    $remaining,
                    $threshold,
                    $cart_total
                );

            return [
                'threshold'           => $threshold,
                'current'             => $cart_total,
                'remaining'           => $remaining,
                'progress'            => $progress,
                'achieved'            => $achieved,
                'message'             => $message,
                'requires_coupon'     => false,
                'has_coupon'          => false,
                'show_coupon_message' => false,
            ];
        }//end if

        // Case 3 & 4: Requires coupon (either or both)
        // If coupon already applied, show success
        if ($has_coupon) {
            return [
                'threshold'           => $threshold,
                'current'             => $cart_total,
                'remaining'           => 0,
                'progress'            => 100,
                'achieved'            => true,
                'message'             => $settings['message_achieved'] ?? __( 'You have free shipping!', 'yayboost' ),
                'requires_coupon'     => false,
                'has_coupon'          => true,
                'show_coupon_message' => false,
            ];
        }

        // Show progress bar or coupon message based on threshold
        if ($achieved) {
            // Threshold met, show coupon message
            $message             = $settings['message_coupon'] ?? __( 'Please enter coupon code to receive free shipping', 'yayboost' );
            $show_coupon_message = true;
        } else {
            // Show progress bar
            $message             = $this->format_message(
                $settings['message_progress'] ?? __( 'Add {remaining} more for free shipping!', 'yayboost' ),
                $remaining,
                $threshold,
                $cart_total
            );
            $show_coupon_message = false;
        }

        return [
            'threshold'           => $threshold,
            'current'             => $cart_total,
            'remaining'           => $remaining,
            'progress'            => $progress,
            'achieved'            => $achieved,
            'message'             => $message,
            'requires_coupon'     => true,
            'has_coupon'          => false,
            'show_coupon_message' => $show_coupon_message,
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

        // Use cart_total from FE if provided (for mini cart block from batch API)
        $cart_total = isset( $_POST['cart_total'] ) ? floatval( $_POST['cart_total'] ) : null;

        $data = $this->get_bar_data( $cart_total );
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
            ]
        );
    }
}
