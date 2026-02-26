<?php
/**
 * Order Bump Renderer
 *
 * Renders order bump offers on checkout based on admin settings and conditions.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\OrderBump;

use YayBoost\Utils\Price;

defined( 'ABSPATH' ) || exit;

/**
 * Renders order bump content on the frontend (checkout).
 */
class OrderBumpRenderer {

    /**
     * Position to WooCommerce hook mapping
     *
     * @var array<string, string>
     */
    protected static $position_hooks = [
        'after_order_summary'    => 'woocommerce_review_order_after_cart_contents',
        'before_payment_methods' => 'woocommerce_review_order_before_payment',
        'before_place_order'     => 'woocommerce_review_order_before_submit',
    ];

    /**
     * Feature instance
     *
     * @var OrderBumpFeature
     */
    protected $feature;

    /**
     * Bump repository
     *
     * @var BumpRepository
     */
    protected $repository;

    /**
     * Constructor
     *
     * @param OrderBumpFeature $feature    Feature instance.
     * @param BumpRepository   $repository Bump repository.
     */
    public function __construct( OrderBumpFeature $feature, BumpRepository $repository ) {
        $this->feature    = $feature;
        $this->repository = $repository;
    }

    /**
     * Get WooCommerce hook name for a position key
     *
     * @param string $position Admin position key (e.g. after_order_summary).
     * @return string Hook name.
     */
    public static function get_hook_for_position( string $position ): string {
        return self::$position_hooks[ $position ] ?? 'woocommerce_review_order_before_submit';
    }

    /**
     * Get all position keys that have a hook
     *
     * @return array<string>
     */
    public static function get_position_keys(): array {
        return array_keys( self::$position_hooks );
    }

    /**
     * Get bumps that should be displayed at a given checkout position
     *
     * @param string $position Position key (after_order_summary, before_payment_methods, before_place_order).
     * @return array List of bump entities with computed price_display, already in cart flag, etc.
     */
    public function get_bumps_for_position( string $position ): array {
        if ( ! $this->feature->is_enabled() ) {
            return [];
        }

        $settings = $this->feature->get_settings();
        $max      = isset( $settings['max_bump_display'] ) ? max( 1, (int) $settings['max_bump_display'] ) : 2;

        $all_bumps = $this->repository->get_active();
        $filtered  = [];

        foreach ( $all_bumps as $bump ) {
            $bump_position = isset( $bump['settings']['position'] ) ? $bump['settings']['position'] : 'before_place_order';
            if ( $bump_position !== $position ) {
                continue;
            }

            if ( ! $this->bump_passes_conditions( $bump ) ) {
                continue;
            }

            $product_id = isset( $bump['settings']['product_id'] ) ? (int) $bump['settings']['product_id'] : 0;
            if ( ! $product_id ) {
                continue;
            }

            if ( ! function_exists( 'wc_get_product' ) ) {
                continue;
            }

            $product = wc_get_product( $product_id );
            if ( ! $product || ! is_a( $product, 'WC_Product' ) ) {
                continue;
            }

            // Skip if this product is already in the cart, unless behavior is "show".
            $behavior = isset( $bump['settings']['behavior'] ) ? (string) $bump['settings']['behavior'] : 'hide';
            if ( $behavior !== 'show' && $this->is_product_in_cart( $product_id ) ) {
                continue;
            }

            $bump_with_price = $this->enrich_bump_for_display( $bump, $product );
            $filtered[]      = $bump_with_price;

            if ( count( $filtered ) >= $max ) {
                break;
            }
        }//end foreach

        return $filtered;
    }

    /**
     * Check if bump conditions are met (show_when + conditions)
     *
     * @param array $bump Bump entity with settings.
     * @return bool
     */
    protected function bump_passes_conditions( array $bump ): bool {
        $settings  = $bump['settings'] ?? [];
        $show_when = $settings['show_when'] ?? 'always';

        if ( $show_when === 'always' ) {
            return true;
        }

        $conditions = $settings['conditions'] ?? [];
        if ( empty( $conditions ) ) {
            return true;
        }

        // All conditions must match (AND).
        foreach ( $conditions as $cond ) {
            $has   = $cond['has'] ?? '';
            $type  = $cond['type'] ?? '';
            $value = isset( $cond['value'] ) ? trim( (string) $cond['value'] ) : '';

            if ( $has !== 'cart' || $value === '' ) {
                continue;
            }

            $matches = false;
            if ( $type === 'product' ) {
                $matches = $this->cart_contains_product( (int) $value );
            } elseif ( $type === 'category' ) {
                $matches = $this->cart_contains_category( $value );
            } elseif ( $type === 'tag' ) {
                $matches = $this->cart_contains_tag( $value );
            }

            if ( ! $matches ) {
                return false;
            }
        }//end foreach

        return true;
    }

    /**
     * Check if product is in cart
     *
     * @param int $product_id Product ID.
     * @return bool
     */
    protected function is_product_in_cart( int $product_id ): bool {
        return $this->cart_contains_product( $product_id );
    }

    /**
     * Check if cart contains a product (by ID)
     *
     * @param int $product_id Product ID.
     * @return bool
     */
    protected function cart_contains_product( int $product_id ): bool {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return false;
        }

        foreach ( WC()->cart->get_cart() as $item ) {
            $item_product_id = isset( $item['product_id'] ) ? (int) $item['product_id'] : 0;
            if ( $item_product_id === $product_id ) {
                return true;
            }
            $item_variation_id = isset( $item['variation_id'] ) ? (int) $item['variation_id'] : 0;
            if ( $item_variation_id && $item_variation_id === $product_id ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if cart contains a product in the given category (slug or term id)
     *
     * @param string $category_slug_or_id Category slug or term ID.
     * @return bool
     */
    protected function cart_contains_category( string $category_slug_or_id ): bool {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return false;
        }

        $term = is_numeric( $category_slug_or_id )
            ? get_term( (int) $category_slug_or_id, 'product_cat' )
            : get_term_by( 'slug', $category_slug_or_id, 'product_cat' );

        if ( ! $term || is_wp_error( $term ) ) {
            return false;
        }

        $category_ids = [ $term->term_id ];
        $children     = get_term_children( $term->term_id, 'product_cat' );
        if ( ! is_wp_error( $children ) && ! empty( $children ) ) {
            $category_ids = array_merge( $category_ids, array_map( 'intval', $children ) );
        }

        foreach ( WC()->cart->get_cart() as $item ) {
            $pid = isset( $item['product_id'] ) ? (int) $item['product_id'] : 0;
            if ( ! $pid ) {
                continue;
            }
            $product_cats = wp_get_post_terms( $pid, 'product_cat', [ 'fields' => 'ids' ] );
            if ( is_wp_error( $product_cats ) || empty( $product_cats ) ) {
                continue;
            }
            if ( ! empty( array_intersect( $category_ids, array_map( 'intval', $product_cats ) ) ) ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if cart contains a product with the given tag (slug or term id)
     *
     * @param string $tag_slug_or_id Tag slug or term ID.
     * @return bool
     */
    protected function cart_contains_tag( string $tag_slug_or_id ): bool {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return false;
        }

        $term = is_numeric( $tag_slug_or_id )
            ? get_term( (int) $tag_slug_or_id, 'product_tag' )
            : get_term_by( 'slug', $tag_slug_or_id, 'product_tag' );

        if ( ! $term || is_wp_error( $term ) ) {
            return false;
        }

        $tag_id = $term->term_id;

        foreach ( WC()->cart->get_cart() as $item ) {
            $pid = isset( $item['product_id'] ) ? (int) $item['product_id'] : 0;
            if ( ! $pid ) {
                continue;
            }
            $product_tags = wp_get_post_terms( $pid, 'product_tag', [ 'fields' => 'ids' ] );
            if ( is_wp_error( $product_tags ) || empty( $product_tags ) ) {
                continue;
            }
            if ( in_array( $tag_id, array_map( 'intval', $product_tags ), true ) ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the bump price for a product when added as an order bump (for cart/checkout).
     * Returns null if no active bump exists for this product.
     *
     * @param int $product_id   Product or parent product ID.
     * @param int $variation_id Variation ID, or 0 for simple product.
     * @return float|null Bump price or null.
     */
    public function get_bump_price_for_product( int $product_id, int $variation_id = 0 ): ?float {
        if ( ! function_exists( 'wc_get_product' ) ) {
            return null;
        }

        $product = $variation_id > 0 ? wc_get_product( $variation_id ) : wc_get_product( $product_id );
        if ( ! $product || ! is_a( $product, 'WC_Product' ) ) {
            return null;
        }

        $regular_price = (float) $product->get_regular_price();
        if ( $regular_price === 0.0 && $product->get_regular_price() === '' ) {
            $regular_price = (float) $product->get_price();
        }

        $lookup_id = $product->get_parent_id();
        if ( $lookup_id <= 0 ) {
            $lookup_id = $product_id;
        }

        $all_bumps = $this->repository->get_active();
        $bumps     = array_filter(
            $all_bumps,
            function ( $b ) use ( $lookup_id ) {
                $pid = isset( $b['settings']['product_id'] ) ? (int) $b['settings']['product_id'] : 0;
                return $pid === $lookup_id;
            }
        );
        if ( empty( $bumps ) ) {
            return null;
        }

        $bump          = reset( $bumps );
        $settings      = $bump['settings'] ?? [];
        $pricing_type  = $settings['pricing_type'] ?? 'percent';
        $pricing_value = isset( $settings['pricing_value'] ) ? (float) $settings['pricing_value'] : 0;

        return Price::get_discounted_price( $regular_price, $pricing_type, $pricing_value );
    }

    /**
     * Add display price and product data to bump for frontend
     *
     * @param array       $bump    Bump entity.
     * @param \WC_Product $product WooCommerce product.
     * @return array Bump with price_display, price_html, product_name, image_html, etc.
     */
    protected function enrich_bump_for_display( array $bump, \WC_Product $product ): array {
        $settings      = $bump['settings'] ?? [];
        $regular_price = (float) $product->get_regular_price();
        if ( $regular_price === 0.0 && $product->get_regular_price() === '' ) {
            $regular_price = (float) $product->get_price();
        }

        $pricing_type  = $settings['pricing_type'] ?? 'percent';
        $pricing_value = isset( $settings['pricing_value'] ) ? (float) $settings['pricing_value'] : 0;

        $bump_price = Price::get_discounted_price( $regular_price, $pricing_type, $pricing_value );

        $default_variation_id = 0;
        if ( $product->is_type( 'variable' ) ) {
            $default_attrs = $this->get_default_variation_attributes( $product );
            if ( ! empty( $default_attrs ) ) {
                $data_store = \WC_Data_Store::load( 'product' );
                $vid        = $data_store->find_matching_product_variation( $product, $default_attrs );
                if ( $vid ) {
                    $default_variation_id = $vid;
                }
            }
        }

        $bump['_display'] = [
            'product_id'           => $product->get_id(),
            'product_name'         => $product->get_name(),
            'permalink'            => $product->get_permalink(),
            'image_html'           => $product->get_image( 'woocommerce_thumbnail' ),
            'regular_price'        => $regular_price,
            'bump_price'           => $bump_price,
            'price_html'           => function_exists( 'wc_price' ) ? wc_price( $bump_price ) : ( wp_strip_all_tags( (string) $bump_price ) ),
            'price_html_raw'       => $bump_price,
            'variation_attributes' => $this->get_default_variation_attributes( $product ),
            'default_variation_id' => $default_variation_id,
        ];

        return $bump;
    }

    /**
     * Get default variation ID for a product. Returns 0 for simple products.
     * Used when adding bump as order line item at checkout.
     *
     * @param int $product_id Parent product ID.
     * @return int Variation ID or 0 for simple product.
     */
    public function get_default_variation_id_for_product( int $product_id ): int {
        if ( ! function_exists( 'wc_get_product' ) ) {
            return 0;
        }
        $product = wc_get_product( $product_id );
        if ( ! $product || ! $product->is_type( 'variable' ) ) {
            return 0;
        }
        $attrs = $this->get_default_variation_attributes( $product );
        if ( empty( $attrs ) ) {
            return 0;
        }
        $data_store = \WC_Data_Store::load( 'product' );
        $vid        = $data_store->find_matching_product_variation( $product, $attrs );
        return $vid ? (int) $vid : 0;
    }

    /**
     * Get default variation attributes for a variable product (for Store API add-to-cart).
     * Returns empty array for simple products.
     *
     * @param \WC_Product $product Product instance.
     * @return array<string, string> Attribute name => value (e.g. attribute_pa_size => medium).
     */
    protected function get_default_variation_attributes( \WC_Product $product ): array {
        if ( ! $product->is_type( 'variable' ) ) {
            return [];
        }

        $defaults = $product->get_default_attributes();
        if ( ! empty( $defaults ) ) {
            $variation = [];
            foreach ( $defaults as $name => $value ) {
                $key               = function_exists( 'wc_variation_attribute_name' ) ? wc_variation_attribute_name( $name ) : 'attribute_' . sanitize_title( $name );
                $variation[ $key ] = $value;
            }
            return $variation;
        }

        $data_store   = \WC_Data_Store::load( 'product' );
        $variation_id = $data_store->find_matching_product_variation( $product, [] );
        if ( $variation_id ) {
            $variation_product = wc_get_product( $variation_id );
            if ( $variation_product && is_a( $variation_product, 'WC_Product_Variation' ) ) {
                return $variation_product->get_variation_attributes();
            }
        }

        $variations = $product->get_available_variations();
        if ( ! empty( $variations ) ) {
            $first = reset( $variations );
            return isset( $first['attributes'] ) && is_array( $first['attributes'] ) ? $first['attributes'] : [];
        }

        return [];
    }

    /**
     * Check if this product is already in the cart as an order bump item.
     *
     * @param int $product_id   Product ID.
     * @param int $variation_id Variation ID or 0.
     * @return bool
     */
    protected function is_bump_product_in_cart( int $product_id, int $variation_id ): bool {
        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            return false;
        }
        foreach ( WC()->cart->get_cart() as $cart_item ) {
            if ( empty( $cart_item[ OrderBumpCartHandler::CART_ITEM_BUMP_KEY ] ) ) {
                continue;
            }
            $pid = (int) ( $cart_item['product_id'] ?? 0 );
            $vid = (int) ( $cart_item['variation_id'] ?? 0 );
            if ( $pid === $product_id && $vid === $variation_id ) {
                return true;
            }
        }
        return false;
    }

    /**
     * Whether the hidden bump-ids input has already been output (once per request).
     *
     * @var bool
     */
    protected static $bump_ids_input_rendered = false;

    /**
     * Render bumps for a given position
     *
     * @param string $position Position key.
     * @return void
     */
    public function render( string $position ): void {
        $bumps = $this->get_bumps_for_position( $position );

        if ( empty( $bumps ) ) {
            return;
        }

        // Hidden input for JS to populate on submit (ensures bump IDs are sent even if checkboxes are outside form or not serialized). Output once per page.
        if ( ! self::$bump_ids_input_rendered ) {
            self::$bump_ids_input_rendered = true;
            echo '<input type="hidden" name="yayboost_bump_ids" id="yayboost_bump_ids" value="" />';
        }

        foreach ( $bumps as $bump ) {
            $this->render_single_bump( $bump );
        }
    }

    /**
     * Render all bumps that would show at any position (for block checkout).
     * Used when WooCommerce Checkout Block is used and classic hooks do not fire.
     *
     * @return string HTML output for all bumps, or empty string if none.
     */
    public function render_all_bumps_for_block(): string {
        if ( ! $this->feature->is_enabled() ) {
            return '';
        }

        $positions = self::get_position_keys();
        $all_bumps = [];

        foreach ( $positions as $position ) {
            $bumps = $this->get_bumps_for_position( $position );
            foreach ( $bumps as $bump ) {
                $all_bumps[] = $bump;
            }
        }

        if ( empty( $all_bumps ) ) {
            return '';
        }

        ob_start();
        echo '<div class="yayboost-order-bump-block-wrapper">';
        foreach ( $all_bumps as $bump ) {
            $this->render_single_bump( $bump );
        }
        echo '</div>';
        return ob_get_clean();
    }

    /**
     * Output HTML for a single bump based on its style setting
     *
     * @param array $bump Bump entity (enriched with _display).
     * @return void
     */
    protected function render_single_bump( array $bump ): void {
        $settings = $bump['settings'] ?? [];
        $display  = $bump['_display'] ?? [];
        $style    = $settings['style'] ?? 'card_with_image';

        $headline             = $settings['headline'] ?? __( 'Special offer', 'yayboost' );
        $description          = $settings['description'] ?? '';
        $checkbox_label       = $settings['checkbox_label'] ?? __( 'Yes, add this to my order', 'yayboost' );
        $product_id           = isset( $display['product_id'] ) ? (int) $display['product_id'] : 0;
        $product_name         = $display['product_name'] ?? '';
        $permalink            = $display['permalink'] ?? '';
        $image_html           = $display['image_html'] ?? '';
        $price_html           = $display['price_html'] ?? '';
        $variation_attributes = $display['variation_attributes'] ?? [];
        $variation_attributes = is_array( $variation_attributes ) ? $variation_attributes : [];
        $default_variation_id = isset( $display['default_variation_id'] ) ? (int) $display['default_variation_id'] : 0;

        $bump_price_raw  = isset( $display['bump_price'] ) ? (float) $display['bump_price'] : 0;
        $wrapper_class   = 'yayboost-order-bump yayboost-order-bump--' . esc_attr( $style );
        $is_bump_in_cart = $this->is_bump_product_in_cart( $product_id, $default_variation_id );
        $checked_attr    = $is_bump_in_cart ? ' checked="checked"' : '';
        ?>
        <div class="<?php echo esc_attr( $wrapper_class ); ?>" data-bump-id="<?php echo esc_attr( (string) ( $bump['id'] ?? '' ) ); ?>" data-product-id="<?php echo esc_attr( (string) $product_id ); ?>" data-default-variation-id="<?php echo esc_attr( (string) $default_variation_id ); ?>" data-bump-price="<?php echo esc_attr( (string) $bump_price_raw ); ?>" data-variation-attributes="<?php echo esc_attr( wp_json_encode( $variation_attributes ) ); ?>">
            <?php if ( $style === 'card_with_image' || $style === 'highlighted_box' ) : ?>
                <div class="yayboost-order-bump__inner">
                    <?php if ( $image_html && ( $style === 'card_with_image' || $style === 'highlighted_box' ) ) : ?>
                        <div class="yayboost-order-bump__image">
                            <?php echo wp_kses_post( $image_html ); ?>
                        </div>
                    <?php endif; ?>
                    <div class="yayboost-order-bump__body">
                        <h3 class="yayboost-order-bump__headline"><?php echo esc_html( $headline ); ?></h3>
                        <?php if ( $description !== '' ) : ?>
                            <p class="yayboost-order-bump__description"><?php echo esc_html( $description ); ?></p>
                        <?php endif; ?>
                        <p class="yayboost-order-bump__product">
                            <a href="<?php echo esc_url( $permalink ); ?>"><?php echo esc_html( $product_name ); ?></a>
                        </p>
                        <p class="yayboost-order-bump__price"><?php echo wp_kses_post( $price_html ); ?></p>
                        <label class="yayboost-order-bump__checkbox-wrap">
                            <input type="checkbox" name="yayboost_bump[]" value="<?php echo esc_attr( (string) $product_id ); ?>" class="yayboost-order-bump__checkbox"<?php echo $checked_attr; ?> />
                            <span class="yayboost-order-bump__checkbox-label"><?php echo esc_html( $checkbox_label ); ?></span>
                        </label>
                    </div>
                </div>
            <?php else : ?>
                <div class="yayboost-order-bump__inner yayboost-order-bump__inner--simple">
                    <label class="yayboost-order-bump__checkbox-wrap">
                        <input type="checkbox" name="yayboost_bump[]" value="<?php echo esc_attr( (string) $product_id ); ?>" class="yayboost-order-bump__checkbox"<?php echo $checked_attr; ?> />
                        <span class="yayboost-order-bump__checkbox-label">
                            <?php echo esc_html( $checkbox_label ); ?>
                            — <a href="<?php echo esc_url( $permalink ); ?>"><?php echo esc_html( $product_name ); ?></a>
                            <span class="yayboost-order-bump__price"><?php echo wp_kses_post( $price_html ); ?></span>
                        </span>
                    </label>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }
}
