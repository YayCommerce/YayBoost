<?php
/**
 * Next Order Coupon Feature
 *
 * Automatically generate a coupon discount after each purchase to encourage repeat orders.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\NextOrderCoupon;

use YayBoost\Features\AbstractFeature;

/**
 * Next Order Coupon feature implementation
 */
class NextOrderCouponFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'next_order_coupon';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Next Order Coupon';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Automatically generate a coupon discount after each purchase to encourage repeat orders';

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
    protected $icon = 'gift';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 100;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        if ( ! $this->is_enabled()) {
            return;
        }

        // Generate coupon when order is completed
        add_action( 'woocommerce_order_status_completed', [ $this, 'generate_coupon_for_order' ], 10, 1 );

        // Display coupon before order table (works for both thank you page and my account)
        add_action( 'woocommerce_order_details_before_order_table', [ $this, 'display_before_order_table' ], 10, 1 );

        // Add coupon to order email (before order table)
        add_action( 'woocommerce_email_before_order_table', [ $this, 'display_email_before_order_table' ], 20, 4 );
    }

    /**
     * Generate coupon for order after completion
     *
     * @param int $order_id Order ID.
     * @return void
     */
    public function generate_coupon_for_order(int $order_id): void {
        // Check if coupon already generated for this order
        $existing_coupon = get_post_meta( $order_id, '_yayboost_next_order_coupon', true );
        if ( ! empty( $existing_coupon )) {
            return;
        }

        $order = \wc_get_order( $order_id ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
        if ( ! $order) {
            return;
        }

        // Check if coupon should be generated
        if ( ! $this->should_generate_coupon( $order )) {
            return;
        }

        $settings = $this->get_settings();

        // Generate unique coupon code based on order ID
        $coupon_code = $this->generate_coupon_code( $settings['coupon_prefix'] ?? 'THANKS-', $order_id );

        // Get customer emails
        $allowed_emails = $this->get_customer_emails( $order );

        // Create coupon
        $coupon = new \WC_Coupon(); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
        $coupon->set_code( $coupon_code );

        // Map discount type
        $discount_type    = $settings['discount_type'] ?? 'percentage';
        $wc_discount_type = $this->map_discount_type( $discount_type );
        $coupon->set_discount_type( $wc_discount_type );

        // Set discount amount
        if (isset( $settings['discount_value'] ) && $settings['discount_value'] > 0) {
            if ($discount_type !== 'free_shipping') {
                $coupon->set_amount( $settings['discount_value'] );
            }
        }

        // Set free shipping if discount type is free_shipping
        if ($discount_type === 'free_shipping') {
            $coupon->set_free_shipping( true );
        }

        // Set expiration date (from order completed date)
        $expires_after  = $settings['expires_after'] ?? 30;
        $completed_date = $order->get_date_completed();
        if ($completed_date) {
            $expiry_date = clone $completed_date;
            $expiry_date->modify( "+{$expires_after} days" );
            $coupon->set_date_expires( $expiry_date );
        }

        // Set usage restrictions
        $coupon->set_individual_use( true );
        $coupon->set_usage_limit( 1 );
        $coupon->set_usage_limit_per_user( 1 );

        // Set allowed emails
        if ( ! empty( $allowed_emails )) {
            $coupon->set_email_restrictions( $allowed_emails );
        }

        // Set minimum spend
        if (isset( $settings['minimum_spend_to_use'] ) && $settings['minimum_spend_to_use'] > 0) {
            $coupon->set_minimum_amount( $settings['minimum_spend_to_use'] );
        }

        // Set exclude sale items
        if (isset( $settings['exclude_sale_items'] ) && $settings['exclude_sale_items']) {
            $coupon->set_exclude_sale_items( true );
        }

        // Save coupon
        $coupon_id = $coupon->save();

        if (is_wp_error( $coupon_id )) {
            return;
        }

        // Store coupon meta: source order ID
        update_post_meta( $coupon_id, '_yayboost_source_order_id', $order_id );

        // Store coupon code in order meta
        update_post_meta( $order_id, '_yayboost_next_order_coupon', $coupon_code );
        update_post_meta( $order_id, '_yayboost_next_order_coupon_id', $coupon_id );
    }

    /**
     * Map discount type from settings to WooCommerce format
     *
     * @param string $discount_type Discount type from settings.
     * @return string WooCommerce discount type
     */
    protected function map_discount_type(string $discount_type): string {
        $mapping = [
            'percentage'    => 'percent',
            'fixed_amount'  => 'fixed_cart',
            'free_shipping' => 'free_shipping',
        ];

        return $mapping[ $discount_type ] ?? 'percent';
    }

    /**
     * Check if coupon should be generated for order
     *
     * @param \WC_Order $order Order object. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound.
     * @return bool
     */
    protected function should_generate_coupon(\WC_Order $order): bool { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
        $settings = $this->get_settings();

        // Check minimum order total (after discount/shipping)
        $minimum_order_total = $settings['minimum_order_total'] ?? 0;
        if ($minimum_order_total > 0) {
            $order_total = $order->get_total();
            if ($order_total < $minimum_order_total) {
                return false;
            }
        }

        // Check customer type
        $customer_type = $settings['customer_type'] ?? 'all';
        $customer_id   = $order->get_customer_id();

        if ($customer_type === 'first_time') {
            if ( ! $this->is_first_time_customer( $customer_id, $order->get_id() )) {
                return false;
            }
        } elseif ($customer_type === 'returning') {
            if ( ! $this->is_returning_customer( $customer_id, $order->get_id() )) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if customer is first-time customer
     *
     * @param int $customer_id Customer ID.
     * @param int $current_order_id Current order ID to exclude.
     * @return bool
     */
    protected function is_first_time_customer(int $customer_id, int $current_order_id): bool {
        if ($customer_id === 0) {
            // Guest checkout - can't determine, default to false
            return false;
        }

        // Query completed/processing orders BEFORE current order (exclude current order)
        $orders = \wc_get_orders( // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
            [
                'customer_id' => $customer_id,
                'status'      => [ 'wc-completed', 'wc-processing' ],
                'exclude'     => [ $current_order_id ],
                'limit'       => 1,
                'return'      => 'ids',
            ]
        );

        // First-time if no previous orders
        return count( $orders ) === 0;
    }

    /**
     * Check if customer is returning customer
     *
     * @param int $customer_id Customer ID.
     * @param int $current_order_id Current order ID to exclude.
     * @return bool
     */
    protected function is_returning_customer(int $customer_id, int $current_order_id): bool {
        if ($customer_id === 0) {
            return false;
        }

        // Query completed/processing orders BEFORE current order (exclude current order)
        $orders = \wc_get_orders( // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound
            [
                'customer_id' => $customer_id,
                'status'      => [ 'wc-completed', 'wc-processing' ],
                'exclude'     => [ $current_order_id ],
                'limit'       => 1,
                'return'      => 'ids',
            ]
        );

        // Returning if has previous orders
        return count( $orders ) > 0;
    }

    /**
     * Get customer emails for coupon restrictions
     *
     * @param \WC_Order $order Order object. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound.
     * @return array Array of allowed emails.
     */
    protected function get_customer_emails(\WC_Order $order): array { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
        $allowed_emails = [];

        // Priority: billing_email (consistent with order email)
        $billing_email = $order->get_billing_email();
        if ( ! empty( $billing_email )) {
            $allowed_emails[] = $billing_email;
        }

        // Also add user_email if logged-in customer (for WooCommerce coupon validation)
        $customer_id = $order->get_customer_id();
        if ($customer_id > 0) {
            $user = get_userdata( $customer_id );
            if ($user && ! empty( $user->user_email )) {
                $user_email = $user->user_email;
                // Add if different from billing_email
                if ( ! in_array( $user_email, $allowed_emails, true )) {
                    $allowed_emails[] = $user_email;
                }
            }
        }

        return $allowed_emails;
    }

    /**
     * Generate unique coupon code based on order ID
     *
     * Format: {prefix}{order_id}
     * Example: THANKS-12345
     *
     * @param string $prefix Coupon prefix.
     * @param int    $order_id Order ID to ensure uniqueness.
     * @return string
     */
    protected function generate_coupon_code(string $prefix, int $order_id): string {
        $code = $prefix . $order_id;

        // Defensive check (should never happen, but good practice)
        if ($this->coupon_code_exists( $code )) {
            // Fallback: append timestamp if somehow duplicate exists
            $code = $prefix . $order_id . '-' . time();
        }

        return $code;
    }

    /**
     * Generate a random coupon code with given prefix, characters, and length.
     *
     * Note: This method is not currently used for order coupons (which use order_id instead).
     * Kept for potential future use or other coupon generation needs.
     *
     * @param string $prefix The prefix for the coupon code.
     * @param string $characters The character set to use for random generation.
     * @param int    $length The number of random characters to append.
     * @return string The generated coupon code.
     */
    protected function generate_random_code(string $prefix, string $characters, int $length): string {
        $code = $prefix;
        for ($i = 0; $i < $length; $i++) {
            $code .= $characters[ wp_rand( 0, strlen( $characters ) - 1 ) ];
        }
        return $code;
    }

    /**
     * Check if coupon code already exists
     *
     * @param string $code Coupon code.
     * @return bool
     */
    protected function coupon_code_exists(string $code): bool {
        $coupon = new \WC_Coupon( $code ); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
        return $coupon->get_id() > 0;
    }

    /**
     * Get coupon code from order
     *
     * @param int $order_id Order ID.
     * @return string|null
     */
    protected function get_coupon_from_order(int $order_id): ?string {
        $coupon_code = get_post_meta( $order_id, '_yayboost_next_order_coupon', true );
        return ! empty( $coupon_code ) ? $coupon_code : null;
    }

    /**
     * Display coupon before order table (works for both thank you page and my account)
     *
     * @param \WC_Order $order Order object. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound.
     * @return void
     */
    public function display_before_order_table(\WC_Order $order): void { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
        $settings          = $this->get_settings();
        $display_locations = $settings['display_locations'] ?? [];

        // Detect context: thank you page or my account
        $is_thank_you_page = \is_checkout() && isset( $_GET['order-received'] ); // phpcs:ignore WordPress.Security.NonceVerification.Recommended
        $context           = $is_thank_you_page ? 'thank_you_page' : 'my_account';
        $location_key      = $is_thank_you_page ? 'thank_you_page' : 'my_account';

        // Check if should display for this location
        if ( ! in_array( $location_key, $display_locations, true )) {
            return;
        }

        $coupon_code = $this->get_coupon_from_order( $order->get_id() );
        if ( ! $coupon_code) {
            return;
        }

        $discount_display = $this->format_discount_display(
            $settings['discount_type'] ?? 'percentage',
            $settings['discount_value'] ?? 0
        );

        $expires_after  = $settings['expires_after'] ?? 30;
        $completed_date = $order->get_date_completed();
        $expiry_date    = '';
        if ($completed_date) {
            $expiry_date = date_i18n( get_option( 'date_format' ), $completed_date->getTimestamp() + ( $expires_after * DAY_IN_SECONDS ) );
        }

        // Use headline only for thank you page
        $headline = '';
        if ($is_thank_you_page) {
            $headline = $settings['thank_you_headline'] ?? __( "🎁 Here's a gift for your next order!", 'yayboost' );
        }

        $message = $this->format_coupon_message(
            $settings['thank_you_message'] ?? __( 'Use code {coupon_code} to get {discount} off your next purchase. Expires {expiry}.', 'yayboost' ),
            $coupon_code,
            $discount_display,
            $expiry_date
        );

        $this->render_coupon_display( $coupon_code, $message, $context, $headline );
    }

    /**
     * Add coupon to order email
     *
     * @param \WC_Order $order Order object. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound.
     * @param bool      $sent_to_admin Whether email is sent to admin.
     * @param bool      $plain_text Whether email is plain text.
     * @param \WC_Email $email Email object. // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound.
     * @return void
     */
    public function display_email_before_order_table(\WC_Order $order, bool $sent_to_admin, bool $plain_text, \WC_Email $email): void { // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedClassFound
        // Only add to customer emails, not admin emails
        if ($sent_to_admin) {
            return;
        }

        // Only add to completed order emails
        if ($email->id !== 'customer_completed_order') {
            return;
        }

        $settings          = $this->get_settings();
        $display_locations = $settings['display_locations'] ?? [];

        if ( ! in_array( 'order_email', $display_locations, true )) {
            return;
        }

        $coupon_code = $this->get_coupon_from_order( $order->get_id() );
        if ( ! $coupon_code) {
            return;
        }

        $discount_display = $this->format_discount_display(
            $settings['discount_type'] ?? 'percentage',
            $settings['discount_value'] ?? 0
        );

        $email_content = $this->format_coupon_message(
            $settings['email_content'] ?? __( "As a thank you, here's {discount} off your next order!", 'yayboost' ),
            $coupon_code,
            $discount_display,
            ''
        );

        $this->render_coupon_display( $coupon_code, $email_content, 'email', '', $plain_text );
    }


    /**
     * Format coupon message with placeholders
     *
     * @param string $template Message template.
     * @param string $coupon_code Coupon code.
     * @param string $discount Discount display.
     * @param string $expiry Expiry date.
     * @return string
     */
    protected function format_coupon_message(string $template, string $coupon_code, string $discount, string $expiry): string {
        $replacements = [
            '{coupon_code}' => '<strong>' . esc_html( $coupon_code ) . '</strong>',
            '{discount}'    => esc_html( $discount ),
            '{expiry}'      => esc_html( $expiry ),
        ];

        $message = $template;
        foreach ($replacements as $placeholder => $replacement) {
            $message = str_replace( $placeholder, $replacement, $message );
        }

        return $message;
    }

    /**
     * Render coupon display with unified HTML structure
     *
     * @param string $coupon_code Coupon code.
     * @param string $message Formatted message.
     * @param string $context Display context: 'thank_you_page', 'email', 'my_account'.
     * @param string $headline Optional headline (for thank you page).
     * @param bool   $plain_text Whether to render as plain text (for email).
     * @return void
     */
    protected function render_coupon_display(string $coupon_code, string $message, string $context = 'thank_you_page', string $headline = '', bool $plain_text = false): void {
        // Plain text version for email
        if ($plain_text) {
            echo "\n\n" . esc_html( $message ) . "\n";
            echo esc_html( __( 'Coupon code:', 'yayboost' ) ) . ' ' . esc_html( $coupon_code ) . "\n";
            return;
        }

        // Unified HTML structure
        $container_style = 'margin: 20px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;';

        // Adjust padding for my_account context
        if ($context === 'my_account') {
            $container_style = 'margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;';
        }

        ?>
        <div class="yayboost-next-order-coupon" style="<?php echo esc_attr( $container_style ); ?>">
            <?php if ( ! empty( $headline ) && $context === 'thank_you_page' ) : ?>
                <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600;">
                    <?php echo esc_html( $headline ); ?>
                </h3>
            <?php endif; ?>

            <div style="margin: 0 0 12px 0; font-size: 14px;">
                <?php echo wp_kses_post( $message ); ?>
            </div>

            <div style="margin: 0; padding: 12px; background: #ffffff; border-radius: 6px; border: 1px solid #dee2e6;">
                <div style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                    <?php echo esc_html( __( 'Coupon code:', 'yayboost' ) ); ?>
                </div>
                <div style="margin: 0; font-size: 18px; font-weight: 700;">
                    <?php echo esc_html( $coupon_code ); ?>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Format discount display based on type
     *
     * @param string $discount_type Discount type.
     * @param float  $discount_value Discount value.
     * @return string
     */
    protected function format_discount_display(string $discount_type, float $discount_value): string {
        $currency_symbol = \get_woocommerce_currency_symbol(); // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedFunctionFound

        switch ($discount_type) {
            case 'percentage':
                return $discount_value . '%';
            case 'fixed_amount':
                return $currency_symbol . number_format( $discount_value, 2 );
            case 'free_shipping':
                return __( 'Free shipping', 'yayboost' );
            default:
                return '';
        }
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
                'enabled'              => false,
                'discount_type'        => 'percentage',
                'discount_value'       => 20,
                'coupon_prefix'        => 'THANKS-',
                'expires_after'        => 30,
                'minimum_order_total'  => 0,
                'customer_type'        => 'all',
                'minimum_spend_to_use' => 0,
                'exclude_sale_items'   => false,
                'display_locations'    => [ 'thank_you_page', 'order_email', 'my_account' ],
                'thank_you_headline'   => __( "🎁 Here's a gift for your next order!", 'yayboost' ),
                'thank_you_message'    => __( 'Use code {coupon_code} to get {discount} off your next purchase. Expires {expiry}.', 'yayboost' ),
                'email_content'        => __( "As a thank you, here's {discount} off your next order!", 'yayboost' ),
            ]
        );
    }
}
