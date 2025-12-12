<?php
/**
 * Frequently Bought Together Feature
 *
 * Displays products that are frequently bought together with the current product
 * to increase average order value and cross-sell opportunities.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

use YayBoost\Features\AbstractFeature;

/**
 * Frequently Bought Together feature implementation
 */
class FrequentlyBoughtTogetherFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'frequently_bought_together';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Frequently Bought Together';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display products that are frequently bought together to boost cross-sales and increase average order value';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'product_discovery';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'shopping-cart';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 10;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        // Display frequently bought together products on product page
        $settings = $this->get_settings();
        $position = $settings['position'] ?? 'after_summary';

        if ($position === 'after_summary') {
            add_action( 'woocommerce_after_single_product_summary', [ $this, 'display_frequently_bought_together' ], 25 );
        } elseif ($position === 'after_tabs') {
            add_action( 'woocommerce_after_single_product', [ $this, 'display_frequently_bought_together' ], 25 );
        } elseif ($position === 'before_related') {
            add_action( 'woocommerce_after_single_product_summary', [ $this, 'display_frequently_bought_together' ], 15 );
        }

        // Track order data for analytics
        add_action( 'woocommerce_thankyou', [ $this, 'track_order_products' ], 10, 1 );

        // Register shortcode
        add_shortcode( 'yayboost_frequently_bought_together', [ $this, 'shortcode' ] );

        // Add AJAX endpoint
        add_action( 'wp_ajax_yayboost_get_frequently_bought_together', [ $this, 'ajax_get_products' ] );
        add_action( 'wp_ajax_nopriv_yayboost_get_frequently_bought_together', [ $this, 'ajax_get_products' ] );

        // Enqueue assets
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        if ( ! is_product()) {
            return;
        }

        $settings = $this->get_settings();

        // Inline styles for the display
        $custom_css = $this->generate_custom_css( $settings );
        wp_add_inline_style( 'yayboost-frontend', $custom_css );
    }

    /**
     * Generate custom CSS based on settings
     *
     * @param array $settings
     * @return string
     */
    protected function generate_custom_css(array $settings): string {
        $title_color        = $settings['title_color'] ?? '#333333';
        $button_color       = $settings['button_color'] ?? '#0073aa';
        $button_hover_color = $settings['button_hover_color'] ?? '#005a87';

        return "
            .yayboost-frequently-bought-together {
                margin: 40px 0;
                padding: 20px 0;
            }
            .yayboost-frequently-bought-together__title {
                color: {$title_color};
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 20px;
            }
            .yayboost-frequently-bought-together__products {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 20px;
            }
            .yayboost-frequently-bought-together__product {
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
            }
            .yayboost-frequently-bought-together__add-to-cart {
                background: {$button_color};
                color: #ffffff;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.3s ease;
            }
            .yayboost-frequently-bought-together__add-to-cart:hover {
                background: {$button_hover_color};
            }
        ";
    }

    /**
     * Track order products for analytics
     *
     * @param int $order_id
     * @return void
     */
    public function track_order_products(int $order_id): void {
        $order = wc_get_order( $order_id );

        if ( ! $order) {
            return;
        }

        $product_ids = [];

        foreach ($order->get_items() as $item) {
            $product_id = $item->get_product_id();
            if ($product_id) {
                $product_ids[] = $product_id;
            }
        }

        if (count( $product_ids ) < 2) {
            return;
        }

        // Store product combinations in meta
        foreach ($product_ids as $product_id) {
            $others = array_filter(
                $product_ids,
                function ($id) use ($product_id) {
                    return $id != $product_id;
                }
            );

            foreach ($others as $other_id) {
                $this->increment_product_pair( $product_id, $other_id );
            }
        }
    }

    /**
     * Increment count for a product pair
     *
     * @param int $product_id
     * @param int $related_id
     * @return void
     */
    protected function increment_product_pair(int $product_id, int $related_id): void {
        $meta_key = 'yayboost_fbt_' . min( $product_id, $related_id ) . '_' . max( $product_id, $related_id );
        $count    = (int) get_option( $meta_key, 0 );
        update_option( $meta_key, $count + 1 );
    }

    /**
     * Get count for a product pair
     *
     * @param int $product_id
     * @param int $related_id
     * @return int
     */
    protected function get_product_pair_count(int $product_id, int $related_id): int {
        $meta_key = 'yayboost_fbt_' . min( $product_id, $related_id ) . '_' . max( $product_id, $related_id );
        return (int) get_option( $meta_key, 0 );
    }

    /**
     * Display frequently bought together products
     *
     * @return void
     */
    public function display_frequently_bought_together(): void {
        global $post;

        if ( ! $post || $post->post_type !== 'product') {
            return;
        }

        $settings = $this->get_settings();

        if ( ! isset( $settings['show_on_product_page'] ) || ! $settings['show_on_product_page']) {
            return;
        }

        echo $this->get_frequently_bought_together_html( $post->ID );
    }

    /**
     * Shortcode handler
     *
     * @param array $atts
     * @return string
     */
    public function shortcode($atts) {
        global $post;

        $atts = shortcode_atts(
            [
                'product_id' => $post ? $post->ID : 0,
                'limit'      => 5,
                'columns'    => 4,
            ],
            $atts
        );

        return $this->get_frequently_bought_together_html( (int) $atts['product_id'], (int) $atts['limit'], (int) $atts['columns'] );
    }

    /**
     * Get frequently bought together products HTML
     *
     * @param int $product_id
     * @param int $limit
     * @param int $columns
     * @return string
     */
    protected function get_frequently_bought_together_html(int $product_id, ?int $limit = null, ?int $columns = null): string {
        $settings = $this->get_settings();
        $limit    = $limit ?? (isset( $settings['display_limit'] ) ? (int) $settings['display_limit'] : 5);
        $columns  = $columns ?? (isset( $settings['columns'] ) ? (int) $settings['columns'] : 4);

        $related_products = $this->get_frequently_bought_together_products( $product_id, $limit );

        if (empty( $related_products )) {
            return '';
        }

        ob_start();
        ?>
        <div class="yayboost-frequently-bought-together">
            <h2 class="yayboost-frequently-bought-together__title">
                <?php echo esc_html( $settings['title'] ?? __( 'Frequently Bought Together', 'yayboost' ) ); ?>
            </h2>
            
            <div class="yayboost-frequently-bought-together__products" style="grid-template-columns: repeat(<?php echo esc_attr( $columns ); ?>, 1fr);">
                <?php
                foreach ($related_products as $related_product) {
                    $product = wc_get_product( $related_product['id'] );

                    if ( ! $product || ! $product->is_purchasable()) {
                        continue;
                    }
                    ?>
                    <div class="yayboost-frequently-bought-together__product">
                        <a href="<?php echo esc_url( $product->get_permalink() ); ?>">
                            <?php echo $product->get_image( 'woocommerce_thumbnail' ); ?>
                        </a>
                        <h3>
                            <a href="<?php echo esc_url( $product->get_permalink() ); ?>">
                                <?php echo esc_html( $product->get_name() ); ?>
                            </a>
                        </h3>
                        <div class="price">
                            <?php echo $product->get_price_html(); ?>
                        </div>
                        <?php
                        if ($product->is_in_stock()) {
                            ?>
                            <button
                                class="yayboost-frequently-bought-together__add-to-cart"
                                data-product-id="<?php echo esc_attr( $product->get_id() ); ?>"
                            >
                                <?php echo esc_html( $settings['button_text'] ?? __( 'Add to Cart', 'yayboost' ) ); ?>
                            </button>
                            <?php
                        } else {
                            ?>
                            <p class="out-of-stock"><?php esc_html_e( 'Out of stock', 'yayboost' ); ?></p>
                            <?php
                        }
                        ?>
                    </div>
                    <?php
                }//end foreach
                ?>
            </div>
        </div>
        <?php

        return ob_get_clean();
    }

    /**
     * Get frequently bought together products for a given product
     *
     * @param int $product_id
     * @param int $limit
     * @return array
     */
    protected function get_frequently_bought_together_products(int $product_id, int $limit = 5): array {
        $settings = $this->get_settings();
        $source   = $settings['data_source'] ?? 'order_history';

        if ($source === 'order_history') {
            return $this->get_products_from_order_history( $product_id, $limit );
        } elseif ($source === 'manual') {
            return $this->get_manual_products( $product_id, $limit );
        } elseif ($source === 'related') {
            return $this->get_related_products( $product_id, $limit );
        }

        return [];
    }

    /**
     * Get products from order history
     *
     * @param int $product_id
     * @param int $limit
     * @return array
     */
    protected function get_products_from_order_history(int $product_id, int $limit): array {
        global $wpdb;

        // Get all product pairs involving this product
        $pairs = [];

        // Query all options that start with yayboost_fbt_ and contain this product_id
        $options = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT option_name, option_value FROM {$wpdb->options} 
                WHERE option_name LIKE %s 
                AND (option_name LIKE %s OR option_name LIKE %s)
                ORDER BY CAST(option_value AS UNSIGNED) DESC
                LIMIT %d",
                'yayboost_fbt_%',
                '%_' . $product_id . '_%',
                '%_' . $product_id,
                $limit * 2
            )
        );

        foreach ($options as $option) {
            // Extract product IDs from option name
            $parts = explode( '_', str_replace( 'yayboost_fbt_', '', $option->option_name ) );
            if (count( $parts ) >= 2) {
                $id1 = (int) $parts[0];
                $id2 = (int) $parts[1];

                $related_id = ($id1 == $product_id) ? $id2 : $id1;

                if ($related_id != $product_id && ! isset( $pairs[ $related_id ] )) {
                    $pairs[ $related_id ] = (int) $option->option_value;
                }
            }
        }

        // Sort by count and limit
        arsort( $pairs );
        $pairs = array_slice( $pairs, 0, $limit, true );

        $products = [];

        foreach (array_keys( $pairs ) as $related_id) {
            $product = wc_get_product( $related_id );

            if ($product && $product->is_visible() && $product->is_purchasable()) {
                $products[] = [
                    'id'    => $related_id,
                    'count' => $pairs[ $related_id ],
                ];
            }
        }

        return $products;
    }

    /**
     * Get manually configured products
     *
     * @param int $product_id
     * @param int $limit
     * @return array
     */
    protected function get_manual_products(int $product_id, int $limit): array {
        $settings        = $this->get_settings();
        $manual_products = $settings['manual_products'] ?? [];

        if ( ! isset( $manual_products[ $product_id ] )) {
            return [];
        }

        $product_ids = array_slice( $manual_products[ $product_id ], 0, $limit );
        $products    = [];

        foreach ($product_ids as $related_id) {
            $product = wc_get_product( $related_id );

            if ($product && $product->is_visible() && $product->is_purchasable()) {
                $products[] = [
                    'id'    => $related_id,
                    'count' => 0,
                ];
            }
        }

        return $products;
    }

    /**
     * Get related products (fallback)
     *
     * @param int $product_id
     * @param int $limit
     * @return array
     */
    protected function get_related_products(int $product_id, int $limit): array {
        $product = wc_get_product( $product_id );

        if ( ! $product) {
            return [];
        }

        $related_ids = wc_get_related_products( $product_id, $limit );
        $products    = [];

        foreach ($related_ids as $related_id) {
            $related_product = wc_get_product( $related_id );

            if ($related_product && $related_product->is_visible() && $related_product->is_purchasable()) {
                $products[] = [
                    'id'    => $related_id,
                    'count' => 0,
                ];
            }
        }

        return $products;
    }

    /**
     * AJAX handler to get frequently bought together products
     *
     * @return void
     */
    public function ajax_get_products(): void {
        $product_id = isset( $_POST['product_id'] ) ? (int) $_POST['product_id'] : 0;

        if ( ! $product_id) {
            wp_send_json_error( [ 'message' => __( 'Product ID is required', 'yayboost' ) ] );
            return;
        }

        $settings = $this->get_settings();
        $limit    = isset( $settings['display_limit'] ) ? (int) $settings['display_limit'] : 5;

        $products = $this->get_frequently_bought_together_products( $product_id, $limit );

        $result = [];

        foreach ($products as $product_data) {
            $product = wc_get_product( $product_data['id'] );

            if ( ! $product) {
                continue;
            }

            $result[] = [
                'id'        => $product->get_id(),
                'name'      => $product->get_name(),
                'price'     => $product->get_price_html(),
                'image'     => wp_get_attachment_image_src( $product->get_image_id(), 'woocommerce_thumbnail' ),
                'permalink' => $product->get_permalink(),
                'in_stock'  => $product->is_in_stock(),
            ];
        }

        wp_send_json_success( $result );
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
                'show_on_product_page' => true,
                'position'             => 'after_summary',
                'display_limit'        => 5,
                'columns'              => 4,
                'title'                => __( 'Frequently Bought Together', 'yayboost' ),
                'button_text'          => __( 'Add to Cart', 'yayboost' ),
                'data_source'          => 'order_history',
                'manual_products'      => [],
                'title_color'          => '#333333',
                'button_color'         => '#0073aa',
                'button_hover_color'   => '#005a87',
            ]
        );
    }
}
