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
     * FBT Repository instance
     *
     * @var FBTRepository
     */
    protected $repository;

    /**
     * FBT Collector instance
     *
     * @var FBTCollector
     */
    protected $collector;

    /**
     * Flag to track if currently rendering FBT section
     *
     * @var bool
     */
    protected static $is_rendering_fbt = false;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        if ( ! $this->is_enabled() ) {
            return;
        }

        // Initialize repository and collector
        $this->repository = new FBTRepository();
        $this->collector  = new FBTCollector();

        // Register data collection hooks (hybrid approach)
        add_action( 'woocommerce_thankyou', [ $this->collector, 'handle_order_thankyou' ], 10 );
        add_action( 'woocommerce_order_status_completed', [ $this->collector, 'handle_order_completed' ], 20 );
        add_action( 'yayboost_process_fbt_order', [ $this->collector, 'handle_background_job' ] );

        // Register display hooks - only check enabled
        if ( $this->is_enabled() ) {
            add_action( 'woocommerce_after_single_product_summary', [ $this, 'render_fbt_section' ], 25 );
        }

        // Enqueue frontend assets
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );

        // Register hook to add FBT checkbox via WooCommerce hook
        add_action( 'woocommerce_after_shop_loop_item', [ $this, 'render_fbt_checkbox' ], 15 );

        // Register AJAX handler for batch add-to-cart
        add_action( 'wp_ajax_yayboost_fbt_batch_add', [ $this, 'ajax_add_fbt_batch' ] );
        add_action( 'wp_ajax_nopriv_yayboost_fbt_batch_add', [ $this, 'ajax_add_fbt_batch' ] );

        // Register cleanup cron job
        if ( ! wp_next_scheduled( 'yayboost_fbt_weekly_cleanup' ) ) {
            wp_schedule_event( time(), 'weekly', 'yayboost_fbt_weekly_cleanup' );
        }
        add_action( 'yayboost_fbt_weekly_cleanup', [ $this, 'run_cleanup' ] );

        // Register Gutenberg block
        if ( $this->is_enabled() ) {
            new FrequentlyBoughtTogetherBlock( $this );
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
                'enabled'             => false,
                'max_products'        => 4,
                'min_order_threshold' => 5,
                'layout'              => 'grid',
                'section_title'       => __( 'Complete Your Purchase', 'yayboost' ),
                'hide_if_in_cart'     => 'hide',
            ]
        );
    }

    /**
     * Enqueue frontend assets
     *
     * @return void
     */
    public function enqueue_assets(): void {
        // Only enqueue on product pages
        if ( ! is_product() ) {
            return;
        }

        // Enqueue script
        wp_enqueue_script(
            'yayboost-fbt',
            YAYBOOST_URL . 'assets/js/frequently-bought-together.js',
            [ 'jquery', 'wc-add-to-cart' ],
            YAYBOOST_VERSION,
            true
        );

        // Enqueue style
        wp_enqueue_style(
            'yayboost-fbt',
            YAYBOOST_URL . 'assets/css/frequently-bought-together.css',
            [],
            YAYBOOST_VERSION
        );

        // Localize script
        wp_localize_script(
            'yayboost-fbt',
            'yayboostFBT',
            [
                'ajax_url' => admin_url( 'admin-ajax.php' ),
                'nonce'    => wp_create_nonce( 'yayboost_fbt_batch' ),
                'i18n'     => [
                    'adding'          => __( 'Adding to cart...', 'yayboost' ),
                    'added'           => __( 'Added to cart', 'yayboost' ),
                    'error'           => __( 'Error adding to cart', 'yayboost' ),
                    'select_products' => __( 'Please select at least one product', 'yayboost' ),
                ],
            ]
        );
    }

    /**
     * Render FBT section on product page
     *
     * @return void
     */
    public function render_fbt_section(): void {
        global $product;

        if ( ! $product ) {
            return;
        }

        $product_id = $product->get_id();
        $this->render_fbt_section_for_product( $product_id );
    }

    /**
     * Render FBT section for a specific product
     *
     * @param int  $product_id Product ID.
     * @param bool $is_mini_cart Whether this is for mini cart.
     * @return void
     */
    protected function render_fbt_section_for_product( int $product_id, bool $is_mini_cart = false ): void {
        if ( ! $this->should_display( $product_id ) ) {
            return;
        }

        $settings = $this->get_settings();
        $products = $this->get_fbt_products( $product_id );

        if ( empty( $products ) ) {
            return;
        }

        // Include template
        $this->render_template( $product_id, $products, $settings, $is_mini_cart );
    }

    /**
     * Check if FBT section should be displayed
     *
     * @param int $product_id Product ID.
     * @return bool
     */
    protected function should_display( int $product_id ): bool {
        if ( ! $this->is_enabled() ) {
            return false;
        }

        $product = wc_get_product( $product_id );
        if ( ! $product || ! $product->is_purchasable() ) {
            return false;
        }

        return true;
    }

    /**
     * Get FBT products for a product
     *
     * @param int $product_id Product ID.
     * @return array Array of WC_Product objects.
     */
    protected function get_fbt_products( int $product_id ): array {
        $settings = $this->get_settings();
        $limit    = isset( $settings['max_products'] ) ? (int) $settings['max_products'] : 4;

        return $this->repository->get_recommendations( $product_id, $limit, $settings );
    }

    /**
     * Render FBT checkbox via WooCommerce hook
     *
     * @return void
     */
    public function render_fbt_checkbox(): void {
        global $product;

        if ( ! $product || ! self::$is_rendering_fbt ) {
            return;
        }

        ?>
        <div>
            <label class="yayboost-fbt-checkbox-label">
                <input type="checkbox"
                        class="yayboost-fbt-selectable"
                        checked
                        data-product-id="<?php echo esc_attr( $product->get_id() ); ?>"
                        data-price="<?php echo esc_attr( $product->get_price() ); ?>">
                <span><?php echo esc_html( $product->get_name() ); ?></span>
            </label>
        </div>
        <?php
    }

    /**
     * Render template
     *
     * @param int   $current_product_id Current product ID.
     * @param array $fbt_products FBT products.
     * @param array $settings Settings.
     * @param bool  $is_mini_cart Whether this is for mini cart.
     * @return void
     */
    protected function render_template( int $current_product_id, array $fbt_products, array $settings, bool $is_mini_cart = false ): void {
        $section_title = $settings['section_title'] ?? __( 'Complete Your Purchase', 'yayboost' );
        $layout        = $settings['layout'] ?? 'grid';
        $max_products  = $settings['max_products'] ?? 4;

        $template_path = YAYBOOST_PATH . 'includes/views/features/frequently-bought-together/template.php';

        if ( ! file_exists( $template_path ) ) {
            return;
        }

        // Set flag to indicate we're rendering FBT section
        self::$is_rendering_fbt = true;

        include $template_path;

        // Reset flag after rendering
        self::$is_rendering_fbt = false;
    }

    /**
     * AJAX handler for batch add to cart
     *
     * @return void
     */
    public function ajax_add_fbt_batch(): void {
        check_ajax_referer( 'yayboost_fbt_batch', 'nonce' );

        if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
            wp_send_json_error( [ 'message' => __( 'WooCommerce is not available', 'yayboost' ) ] );
            return;
        }

        $product_ids        = isset( $_POST['product_ids'] ) ? array_map( 'intval', (array) $_POST['product_ids'] ) : [];
        $current_product_id = isset( $_POST['current_product_id'] ) ? (int) $_POST['current_product_id'] : 0;

        if ( empty( $product_ids ) ) {
            wp_send_json_error( [ 'message' => __( 'No products selected', 'yayboost' ) ] );
            return;
        }

        // Ensure current product is included
        if ( $current_product_id && ! in_array( $current_product_id, $product_ids, true ) ) {
            array_unshift( $product_ids, $current_product_id );
        }

        $added_products = [];
        $errors         = [];

        foreach ( $product_ids as $product_id ) {
            $product = wc_get_product( $product_id );

            if ( ! $product ) {
                /* translators: %d: Product ID */
                $errors[] = sprintf( __( 'Product #%d not found', 'yayboost' ), $product_id );
                continue;
            }

            if ( ! $product->is_purchasable() ) {
                /* translators: %s: Product name */
                $errors[] = sprintf( __( 'Product "%s" is not purchasable', 'yayboost' ), $product->get_name() );
                continue;
            }

            if ( ! $product->is_in_stock() ) {
                /* translators: %s: Product name */
                $errors[] = sprintf( __( 'Product "%s" is out of stock', 'yayboost' ), $product->get_name() );
                continue;
            }

            // Add to cart
            $cart_item_key = WC()->cart->add_to_cart( $product_id, 1 );

            if ( $cart_item_key ) {
                $added_products[] = [
                    'id'   => $product_id,
                    'name' => $product->get_name(),
                ];
            } else {
                /* translators: %s: Product name */
                $errors[] = sprintf( __( 'Failed to add "%s" to cart', 'yayboost' ), $product->get_name() );
            }
        }//end foreach

        // Get cart fragments
        $fragments = apply_filters( 'woocommerce_add_to_cart_fragments', [] );

        if ( ! empty( $added_products ) ) {
            /* translators: %d: Number of products */
            wp_send_json_success(
                [
                    'message'        => sprintf( __( 'Added %d product(s) to cart.', 'yayboost' ), count( $added_products ) ),
                    'added_products' => $added_products,
                    'errors'         => $errors,
                    'fragments'      => $fragments,
                    'cart_hash'      => WC()->cart->get_cart_hash(),
                ]
            );
        } else {
            wp_send_json_error(
                [
                    'message' => __( 'Failed to add products to cart', 'yayboost' ),
                    'errors'  => $errors,
                ]
            );
        }
    }

    /**
     * Run cleanup cron job
     *
     * @return void
     */
    public function run_cleanup(): void {
        $cleanup  = new FBTCleanup();
        $settings = $this->get_settings();
        $stats    = $cleanup->run_cleanup( $settings );

        // Log cleanup stats (only in debug mode)
        if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
            error_log( sprintf( 'YayBoost FBT Cleanup: %d low count deleted, %d orphaned deleted, %d old deleted', $stats['low_count_deleted'], $stats['orphaned_deleted'], $stats['old_deleted'] ) );
        }
    }

    /**
     * Get localization data for JavaScript
     * Shared method used by both classic feature and block
     *
     * @return array Localization data array
     */
    public function get_localization_data(): array {
        $settings = $this->get_settings();

        return [
            'ajaxUrl'  => admin_url( 'admin-ajax.php' ),
            'nonce'    => wp_create_nonce( 'yayboost_fbt_batch' ),
            'settings' => [
                'maxProducts'       => $settings['max_products'] ?? $this->get_default_settings()['max_products'],
                'sectionTitle'      => $settings['section_title'] ?? $this->get_default_settings()['section_title'],
                'layout'            => $settings['layout'] ?? $this->get_default_settings()['layout'],
                'minOrderThreshold' => $settings['min_order_threshold'] ?? $this->get_default_settings()['min_order_threshold'],
                'hideIfInCart'      => $settings['hide_if_in_cart'] ?? $this->get_default_settings()['hide_if_in_cart'],
            ],
            'i18n'     => [
                'adding'          => __( 'Adding to cart...', 'yayboost' ),
                'added'           => __( 'Added to cart', 'yayboost' ),
                'error'           => __( 'Error adding to cart', 'yayboost' ),
                'select_products' => __( 'Please select at least one product', 'yayboost' ),
            ],
        ];
    }
}
