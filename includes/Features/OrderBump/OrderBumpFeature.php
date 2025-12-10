<?php
/**
 * Order Bump Feature
 *
 * Display upsell offers during checkout that customers can add
 * to their order with a single click.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\OrderBump;

use YayBoost\Features\AbstractFeature;

/**
 * Order Bump feature implementation
 */
class OrderBumpFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'order_bump';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Order Bump';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display one-click upsell offers during checkout to increase order value';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'checkout_booster';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'plus-circle';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 1;

    /**
     * Bump repository
     *
     * @var BumpRepository
     */
    protected $repository;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        $this->repository = new BumpRepository();

        $settings = $this->get_settings();
        $position = $settings['default_position'] ?? 'before_payment';

        // Hook into checkout based on position
        $this->register_display_hooks( $position );

        // Enqueue assets
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );

        // AJAX handlers
        add_action( 'wp_ajax_yayboost_add_bump', [ $this, 'ajax_add_bump' ] );
        add_action( 'wp_ajax_nopriv_yayboost_add_bump', [ $this, 'ajax_add_bump' ] );
        add_action( 'wp_ajax_yayboost_remove_bump', [ $this, 'ajax_remove_bump' ] );
        add_action( 'wp_ajax_nopriv_yayboost_remove_bump', [ $this, 'ajax_remove_bump' ] );
    }

    /**
     * Register display hooks based on position
     *
     * @param string $position
     * @return void
     */
    protected function register_display_hooks(string $position): void {
        switch ($position) {
            case 'before_payment':
                add_action( 'woocommerce_review_order_before_payment', [ $this, 'render_bumps' ] );
                break;
            case 'after_order_review':
                add_action( 'woocommerce_checkout_after_order_review', [ $this, 'render_bumps' ] );
                break;
            case 'before_billing':
                add_action( 'woocommerce_before_checkout_billing_form', [ $this, 'render_bumps' ] );
                break;
            case 'after_billing':
                add_action( 'woocommerce_after_checkout_billing_form', [ $this, 'render_bumps' ] );
                break;
            default:
                add_action( 'woocommerce_review_order_before_payment', [ $this, 'render_bumps' ] );
        }
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        if ( ! is_checkout()) {
            return;
        }

        // Inline styles
        wp_add_inline_style( 'yayboost-frontend', $this->get_inline_styles() );
    }

    /**
     * Get inline styles
     *
     * @return string
     */
    protected function get_inline_styles(): string {
        return '
            .yayboost-order-bump {
                border: 2px dashed #ddd;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                background: #fafafa;
            }
            .yayboost-order-bump--selected {
                border-color: #4CAF50;
                background: #f1f8e9;
            }
            .yayboost-order-bump__header {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 10px;
            }
            .yayboost-order-bump__checkbox {
                width: 20px;
                height: 20px;
            }
            .yayboost-order-bump__image {
                width: 60px;
                height: 60px;
                object-fit: cover;
                border-radius: 4px;
            }
            .yayboost-order-bump__content {
                flex: 1;
            }
            .yayboost-order-bump__title {
                font-weight: 600;
                margin-bottom: 5px;
            }
            .yayboost-order-bump__price {
                color: #666;
            }
            .yayboost-order-bump__price-original {
                text-decoration: line-through;
                color: #999;
            }
            .yayboost-order-bump__price-discounted {
                color: #e53935;
                font-weight: 600;
            }
            .yayboost-order-bump__description {
                font-size: 14px;
                color: #666;
                margin-top: 10px;
            }
        ';
    }

    /**
     * Render order bumps
     *
     * @return void
     */
    public function render_bumps(): void {
        $bumps = $this->get_applicable_bumps();

        if (empty( $bumps )) {
            return;
        }

        $settings  = $this->get_settings();
        $max_bumps = (int) ($settings['max_bumps_per_page'] ?? 3);
        $bumps     = array_slice( $bumps, 0, $max_bumps );

        foreach ($bumps as $bump) {
            $this->render_single_bump( $bump );
        }
    }

    /**
     * Get bumps applicable to current cart
     *
     * @return array
     */
    protected function get_applicable_bumps(): array {
        $all_bumps        = $this->repository->get_active();
        $cart_items       = WC()->cart ? WC()->cart->get_cart() : [];
        $cart_product_ids = array_map(
            function ($item) {
                return $item['product_id'];
            },
            $cart_items
        );

        $applicable = [];

        foreach ($all_bumps as $bump) {
            if ($this->is_bump_applicable( $bump, $cart_product_ids )) {
                $applicable[] = $bump;
            }
        }

        // Sort by priority
        usort(
            $applicable,
            function ($a, $b) {
                return ($a['priority'] ?? 10) - ($b['priority'] ?? 10);
            }
        );

        return $applicable;
    }

    /**
     * Check if bump is applicable to cart
     *
     * @param array $bump
     * @param array $cart_product_ids
     * @return bool
     */
    protected function is_bump_applicable(array $bump, array $cart_product_ids): bool {
        $settings = $bump['settings'] ?? [];

        // Check if bump product is not already in cart
        $bump_product_id = $settings['product_id'] ?? 0;
        if (in_array( $bump_product_id, $cart_product_ids, true )) {
            return false;
        }

        // Check trigger conditions
        $trigger_type = $settings['trigger_type'] ?? 'all';

        switch ($trigger_type) {
            case 'all':
                return true;

            case 'specific_products':
                $trigger_products = $settings['trigger_products'] ?? [];
                return ! empty( array_intersect( $trigger_products, $cart_product_ids ) );

            case 'specific_categories':
                $trigger_categories = $settings['trigger_categories'] ?? [];
                foreach ($cart_product_ids as $product_id) {
                    $product_cats = wp_get_post_terms( $product_id, 'product_cat', [ 'fields' => 'ids' ] );
                    if ( ! empty( array_intersect( $trigger_categories, $product_cats ) )) {
                        return true;
                    }
                }
                return false;

            case 'cart_total':
                $min_total  = (float) ($settings['min_cart_total'] ?? 0);
                $cart_total = WC()->cart ? (float) WC()->cart->get_subtotal() : 0;
                return $cart_total >= $min_total;

            default:
                return true;
        }//end switch
    }

    /**
     * Render a single bump offer
     *
     * @param array $bump
     * @return void
     */
    protected function render_single_bump(array $bump): void {
        $settings   = $bump['settings'] ?? [];
        $product_id = $settings['product_id'] ?? 0;
        $product    = wc_get_product( $product_id );

        if ( ! $product) {
            return;
        }

        $discount_type  = $settings['discount_type'] ?? 'none';
        $discount_value = (float) ($settings['discount_value'] ?? 0);

        $original_price   = (float) $product->get_price();
        $discounted_price = $this->calculate_discounted_price( $original_price, $discount_type, $discount_value );

        $is_in_cart     = $this->is_bump_in_cart( $bump['id'] );
        $selected_class = $is_in_cart ? ' yayboost-order-bump--selected' : '';
        ?>
        <div class="yayboost-order-bump<?php echo esc_attr( $selected_class ); ?>" data-bump-id="<?php echo esc_attr( $bump['id'] ); ?>">
            <div class="yayboost-order-bump__header">
                <input
                    type="checkbox"
                    class="yayboost-order-bump__checkbox"
                    <?php checked( $is_in_cart ); ?>
                    data-bump-id="<?php echo esc_attr( $bump['id'] ); ?>"
                    data-product-id="<?php echo esc_attr( $product_id ); ?>"
                />
                <?php if ($image = $product->get_image_id()) : ?>
                    <img
                        src="<?php echo esc_url( wp_get_attachment_image_url( $image, 'thumbnail' ) ); ?>"
                        alt="<?php echo esc_attr( $product->get_name() ); ?>"
                        class="yayboost-order-bump__image"
                    />
                <?php endif; ?>
                <div class="yayboost-order-bump__content">
                    <div class="yayboost-order-bump__title">
                        <?php echo esc_html( $settings['headline'] ?? $product->get_name() ); ?>
                    </div>
                    <div class="yayboost-order-bump__price">
                        <?php if ($discounted_price < $original_price) : ?>
                            <span class="yayboost-order-bump__price-original">
                                <?php echo wp_kses_post( wc_price( $original_price ) ); ?>
                            </span>
                            <span class="yayboost-order-bump__price-discounted">
                                <?php echo wp_kses_post( wc_price( $discounted_price ) ); ?>
                            </span>
                        <?php else : ?>
                            <?php echo wp_kses_post( wc_price( $original_price ) ); ?>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
            <?php if ( ! empty( $settings['description'] )) : ?>
                <div class="yayboost-order-bump__description">
                    <?php echo wp_kses_post( $settings['description'] ); ?>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }

    /**
     * Calculate discounted price
     *
     * @param float  $price
     * @param string $discount_type
     * @param float  $discount_value
     * @return float
     */
    protected function calculate_discounted_price(float $price, string $discount_type, float $discount_value): float {
        switch ($discount_type) {
            case 'percentage':
                return $price * (1 - ($discount_value / 100));
            case 'fixed':
                return max( 0, $price - $discount_value );
            default:
                return $price;
        }
    }

    /**
     * Check if bump product is in cart
     *
     * @param int $bump_id
     * @return bool
     */
    protected function is_bump_in_cart(int $bump_id): bool {
        if ( ! WC()->cart) {
            return false;
        }

        foreach (WC()->cart->get_cart() as $cart_item) {
            if (isset( $cart_item['yayboost_bump_id'] ) && (int) $cart_item['yayboost_bump_id'] === $bump_id) {
                return true;
            }
        }

        return false;
    }

    /**
     * AJAX: Add bump product to cart
     *
     * @return void
     */
    public function ajax_add_bump(): void {
        check_ajax_referer( 'yayboost_nonce', 'nonce' );

        $bump_id = isset( $_POST['bump_id'] ) ? (int) $_POST['bump_id'] : 0;
        $bump    = $this->repository->find( $bump_id );

        if ( ! $bump) {
            wp_send_json_error( [ 'message' => __( 'Bump offer not found.', 'yayboost' ) ] );
        }

        $settings   = $bump['settings'] ?? [];
        $product_id = $settings['product_id'] ?? 0;
        $quantity   = $settings['quantity'] ?? 1;

        // Calculate custom price
        $product = wc_get_product( $product_id );
        if ( ! $product) {
            wp_send_json_error( [ 'message' => __( 'Product not found.', 'yayboost' ) ] );
        }

        $discount_type  = $settings['discount_type'] ?? 'none';
        $discount_value = (float) ($settings['discount_value'] ?? 0);
        $custom_price   = $this->calculate_discounted_price( (float) $product->get_price(), $discount_type, $discount_value );

        // Add to cart with custom data
        $cart_item_data = [
            'yayboost_bump_id'    => $bump_id,
            'yayboost_bump_price' => $custom_price,
        ];

        $cart_item_key = WC()->cart->add_to_cart( $product_id, $quantity, 0, [], $cart_item_data );

        if ($cart_item_key) {
            wp_send_json_success(
                [
                    'message'       => __( 'Added to cart!', 'yayboost' ),
                    'cart_item_key' => $cart_item_key,
                ]
            );
        } else {
            wp_send_json_error( [ 'message' => __( 'Could not add to cart.', 'yayboost' ) ] );
        }
    }

    /**
     * AJAX: Remove bump product from cart
     *
     * @return void
     */
    public function ajax_remove_bump(): void {
        check_ajax_referer( 'yayboost_nonce', 'nonce' );

        $bump_id = isset( $_POST['bump_id'] ) ? (int) $_POST['bump_id'] : 0;

        if ( ! WC()->cart) {
            wp_send_json_error( [ 'message' => __( 'Cart not available.', 'yayboost' ) ] );
        }

        foreach (WC()->cart->get_cart() as $cart_item_key => $cart_item) {
            if (isset( $cart_item['yayboost_bump_id'] ) && (int) $cart_item['yayboost_bump_id'] === $bump_id) {
                WC()->cart->remove_cart_item( $cart_item_key );
                wp_send_json_success( [ 'message' => __( 'Removed from cart.', 'yayboost' ) ] );
            }
        }

        wp_send_json_error( [ 'message' => __( 'Item not found in cart.', 'yayboost' ) ] );
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
                'default_position'   => 'before_payment',
                'max_bumps_per_page' => 3,
                'show_product_image' => true,
                'checkbox_style'     => 'default',
            ]
        );
    }
}
