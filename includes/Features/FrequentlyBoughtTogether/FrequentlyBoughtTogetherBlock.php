<?php
/**
 * Frequently Bought Together Gutenberg Block
 *
 * Registers the Frequently Bought Together block using WordPress Interactivity API.
 * Based on WishlistItems pattern - uses save.js instead of render.php
 * - Editor: Data localized via enqueue_block_editor_assets
 * - Frontend: Block wrapped with Interactive API via render_block filter
 * - Query filtering: Filters query_loop_block_query_vars to show FBT products
 *
 * @package YayBoost
 */

namespace YayBoost\Features\FrequentlyBoughtTogether;

/**
 * Frequently Bought Together Block class
 */
class FrequentlyBoughtTogetherBlock {

    /**
     * Feature instance
     *
     * @var FrequentlyBoughtTogetherFeature
     */
    private $feature;

    /**
     * Repository instance
     *
     * @var FBTRepository
     */
    private $repository;

    /**
     * Constructor
     *
     * @param FrequentlyBoughtTogetherFeature $feature Feature instance.
     */
    public function __construct( FrequentlyBoughtTogetherFeature $feature ) {
        $this->feature    = $feature;
        $this->repository = new FBTRepository();

        add_action( 'init', [ $this, 'register_block' ] );
        add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_data' ] );

        // Filter queries for FBT products
        add_filter(
            'query_loop_block_query_vars',
            [ $this, 'build_frontend_query' ],
            100,
            3
        );

        add_filter(
            'rest_product_query',
            [ $this, 'build_editor_query' ],
            100,
            2
        );

        // Wrap block with Interactive API wrapper (like WishlistItems pattern)
        add_filter( 'render_block', [ $this, 'wrap_block_with_interactivity' ], 10, 2 );
    }

    /**
     * Get feature instance
     *
     * @return FrequentlyBoughtTogetherFeature|null
     */
    public function get_feature() {
        return $this->feature;
    }

    /**
     * Register the block type
     *
     * @return void
     */
    public function register_block() {
        $block_json_path = YAYBOOST_PATH . 'assets/dist/blocks/frequently-bought-together/block.json';

        if ( ! file_exists( $block_json_path ) ) {
            return;
        }

        // Register block - WordPress will use providesContext from block.json
        register_block_type( $block_json_path );
    }

    /**
     * Enqueue data for block editor
     * Localizes feature config to editor script for live preview
     *
     * @return void
     */
    public function enqueue_editor_data() {
        wp_localize_script(
            'yayboost-frequently-bought-together-editor-script',
            'yayboostFBT',
            $this->feature->get_localization_data()
        );
    }

    /**
     * Filter frontend query to show FBT products
     *
     * @param array    $query Query vars.
     * @param WP_Block $block Block instance.
     * @param int      $page  Page number.
     * @return array Modified query vars.
     */
    public function build_frontend_query( $query, $block, $page ) {
        $is_fbt_query = $block->context['query']['isFBTQuery'] ?? false;

        if ( ! $is_fbt_query ) {
            return $query;
        }

        // Get current product ID from block context
        $current_product_id = $block->context['currentProductId'] ?? 120;

        // Try to get from global product if not set
        if ( ! $current_product_id ) {
            global $product;
            if ( $product && is_a( $product, 'WC_Product' ) ) {
                $current_product_id = $product->get_id();
            }
        }

        // If still no product ID, try to get from post
        if ( ! $current_product_id ) {
            global $post;
            if ( $post && 'product' === $post->post_type ) {
                $current_product_id = $post->ID;
            }
        }

        if ( ! $current_product_id ) {
            // Return no results if no current product
            $query['post__in'] = [ 0 ];
            return $query;
        }

        // Get FBT products from repository
        $settings     = $this->feature->get_settings();
        $max_products = isset( $settings['max_products'] ) ? (int) $settings['max_products'] : 4;
        $fbt_products = $this->repository->get_recommendations( $current_product_id, $max_products, $settings );

        if ( empty( $fbt_products ) ) {
            // Return no results
            $query['post__in'] = [ 0 ];
        } else {
            // Extract product IDs
            $product_ids       = array_map(
                function ( $product ) {
                    return $product->get_id();
                },
                $fbt_products
            );
            $query['post__in'] = $product_ids;
        }

        // Ensure no pagination for FBT products
        $query['posts_per_page'] = -1;
        // -1 means no pagination
        $query['nopaging'] = true;
        // Alternative way to disable pagination

        return $query;
    }

    /**
     * Filter editor query to show mock products for preview
     *
     * @param array           $query Query vars.
     * @param WP_REST_Request $request Request object.
     * @return array Modified query vars.
     */
    public function build_editor_query( $query, $request ) {
        // Check if this is an FBT query in the editor
        $is_fbt_query = $request->get_param( 'isFBTQuery' );

        if ( $is_fbt_query ) {
            // Get 4 newest products for editor preview
            $fbt_products = get_posts(
                [
                    'post_type'      => 'product',
                    'posts_per_page' => 4,
                    'orderby'        => 'date',
                    'order'          => 'DESC',
                    'post_status'    => 'publish',
                ]
            );

            $product_ids = array_map(
                function ( $product ) {
                    return $product->ID;
                },
                $fbt_products
            );

            $query['post__in']       = $product_ids;
            $query['posts_per_page'] = 4;
            $query['nopaging']       = true;
            $query['paged']          = 1;
        }//end if

        return $query;
    }

    /**
     * Wrap block with Interactive API wrapper
     * Similar to WishlistItems pattern but with Interactive API support
     *
     * @param string $block_content The block content.
     * @param array  $block         The block data.
     * @return string Modified block content.
     */
    public function wrap_block_with_interactivity( $block_content, $block ) {
        // Only wrap our FBT block
        if ( 'yayboost/frequently-bought-together' !== $block['blockName'] ) {
            return $block_content;
        }

        // If no feature or disabled, return empty
        if ( ! $this->feature || ! $this->feature->is_enabled() ) {
            return '';
        }

        // Get current product ID from attributes
        $current_product_id = $block['attrs']['currentProductId'] ?? 120;

        // Try to get from global product if not set
        if ( ! $current_product_id && function_exists( 'wc_get_product' ) ) {
            global $product;
            if ( $product && is_a( $product, 'WC_Product' ) ) {
                $current_product_id = $product->get_id();
            }
        }

        // If still no product ID, try to get from post
        if ( ! $current_product_id ) {
            global $post;
            if ( $post && 'product' === $post->post_type ) {
                $current_product_id = $post->ID;
            }
        }

        // If no current product, return empty
        if ( ! $current_product_id ) {
            return '';
        }

        // Get FBT products from repository
        $settings     = $this->feature->get_settings();
        $max_products = isset( $settings['max_products'] ) ? (int) $settings['max_products'] : 4;
        $fbt_products = $this->repository->get_recommendations( $current_product_id, $max_products, $settings );

        if ( empty( $fbt_products ) ) {
            return '';
        }

        // Prepare products data for Interactive API
        $products_data = [];
        $product_ids   = [];
        foreach ( $fbt_products as $fbt_product ) {
            if ( ! is_a( $fbt_product, 'WC_Product' ) ) {
                continue;
            }
            $product_id      = $fbt_product->get_id();
            $product_ids[]   = $product_id;
            $products_data[] = [
                'id'    => $product_id,
                'price' => (float) $fbt_product->get_price(),
            ];
        }

        // Default: all products selected
        $selected_products = $product_ids;

        // Get localization data for Interactivity API state
        $localization_data = $this->feature->get_localization_data();

        // Set global state for the store (hydrates view.js state)
        wp_interactivity_state(
            'yayboost/frequently-bought-together',
            [
                'settings'         => $localization_data['settings'] ?? [],
                'ajaxUrl'          => $localization_data['ajaxUrl'] ?? admin_url( 'admin-ajax.php' ),
                'nonce'            => $localization_data['nonce'] ?? wp_create_nonce( 'yayboost_fbt_batch' ),
                'currentProductId' => $current_product_id,
            ]
        );

        // Prepare context for Interactivity API (per-block instance data)
        $total_price = array_sum( array_column( $products_data, 'price' ) );
        $context     = [
            'currentProductId'    => $current_product_id,
            'products'            => $products_data,
            'selectedProducts'    => $selected_products,
            'totalPrice'          => $total_price,
            'totalPriceFormatted' => function_exists( 'wc_price' ) ? wc_price( $total_price ) : '$' . number_format( $total_price, 2 ),
        ];

        // Get section title
        $section_title = $settings['section_title'] ?? __( 'Frequently Bought Together', 'yayboost' );

        // Get query ID
        $query_id = $block['attrs']['queryId'] ?? 0;

        // Wrap content with Interactive API wrapper
        ob_start();
        ?>
        <section 
            class="yayboost-fbt-block-wrapper"
            data-wp-interactive="yayboost/frequently-bought-together"
            data-wp-init="callbacks.init"
            <?php echo wp_interactivity_data_wp_context( $context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
        >
            <?php if ( $section_title ) : ?>
                <h2 class="yayboost-fbt-title"><?php echo esc_html( $section_title ); ?></h2>
            <?php endif; ?>
            
            <div class="yayboost-fbt-products" data-query-id="<?php echo esc_attr( $query_id ); ?>">
                <?php echo $block_content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
            </div>
            
            <div class="yayboost-fbt-footer">
                <div class="yayboost-fbt-total">
                    <?php esc_html_e( 'Total:', 'yayboost' ); ?>
                    <span class="yayboost-fbt-total-price" data-wp-text="context.totalPriceFormatted">
                        <?php echo function_exists( 'wc_price' ) ? wc_price( $total_price ) : '$' . number_format( $total_price, 2 ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
                    </span>
                </div>
                <button
                    type="button"
                    class="button yayboost-fbt-batch-add"
                    data-wp-on--click="actions.batchAddToCart"
                >
                    <?php esc_html_e( 'Add Selected to Cart', 'yayboost' ); ?>
                </button>
            </div>
        </section>
        <?php
        return ob_get_clean();
    }
}
