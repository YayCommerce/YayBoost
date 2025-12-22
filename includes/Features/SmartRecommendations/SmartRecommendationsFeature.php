<?php
/**
 * Smart Recommendations Feature
 *
 * Display intelligent product recommendations on single product pages
 * based on configurable rules and customer behavior.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\SmartRecommendations;

use YayBoost\Features\AbstractFeature;
use YayBoost\Repository\EntityRepository;

/**
 * Smart Recommendations feature implementation
 */
class SmartRecommendationsFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'smart_recommendations';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Smart Recommendations';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Manage your product recommendation rules';

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
    protected $icon = 'record';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 1;

    /**
     * Recommendation repository
     *
     * @var RecommendationRepository
     */
    protected $repository;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        // Include the repository class
        require_once plugin_dir_path( __FILE__ ) . 'RecommendationRepository.php';
        
        $this->repository = new RecommendationRepository();

        // Hook into single product pages
        add_action( 'woocommerce_after_single_product_summary', [ $this, 'render_recommendations' ], 20 );

        // Enqueue frontend assets
        add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );

        // AJAX endpoints for dynamic updates
        add_action( 'wp_ajax_yayboost_get_recommendations', [ $this, 'ajax_get_recommendations' ] );
        add_action( 'wp_ajax_nopriv_yayboost_get_recommendations', [ $this, 'ajax_get_recommendations' ] );
        add_action( 'wp_ajax_yayboost_add_to_cart_recommendation', [ $this, 'ajax_add_to_cart_recommendation' ] );
        add_action( 'wp_ajax_nopriv_yayboost_add_to_cart_recommendation', [ $this, 'ajax_add_to_cart_recommendation' ] );
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

        // Enqueue CSS
        wp_enqueue_style(
            'yayboost-recommendations',
            plugin_dir_url( __FILE__ ) . 'assets/recommendations.css',
            [],
            '1.0.0'
        );

        // Enqueue JavaScript
        wp_enqueue_script(
            'yayboost-recommendations',
            plugin_dir_url( __FILE__ ) . 'assets/recommendations.js',
            [ 'jquery' ],
            '1.0.0',
            true
        );

        // Localize script for AJAX
        wp_localize_script(
            'yayboost-recommendations',
            'yayboostRecommendations',
            [
                'ajaxUrl' => admin_url( 'admin-ajax.php' ),
                'nonce'   => wp_create_nonce( 'yayboost_recommendations' ),
            ]
        );
    }

    /**
     * Render recommendations on single product page
     *
     * @return void
     */
    public function render_recommendations(): void {
        global $product;

        if ( ! $product || ! $product->get_id()) {
            return;
        }

        $matching_rules = $this->get_matching_rules( $product );

        if (empty( $matching_rules )) {
            return;
        }

        foreach ( $matching_rules as $rule ) {
            $settings = $rule['settings'] ?? [];
            
            // Check if should show on product page
            if ( ! ( $settings['show_on_product_page'] ?? true )) {
                continue;
            }

            // Check if rule is active
            if ( ($rule['status'] ?? 'active' ) !== 'active' ) {
                continue;
            }

            $recommended_products = $this->get_recommended_products( $rule, $product );

            if ( ! empty( $recommended_products )) {
                $this->render_recommendation_section( $rule, $recommended_products );
                break; // Only show first matching rule
            }
        }
    }

    /**
     * Get recommendation rules that match current product
     *
     * @param WC_Product $product Current product
     * @return array Matching rules
     */
    protected function get_matching_rules( $product ): array {
        $product_id = $product->get_id();
        $category_ids = $product->get_category_ids();
        $tag_ids = wp_get_post_terms( $product_id, 'product_tag', [ 'fields' => 'ids' ] );

        $all_rules = $this->repository->get_active_rules();
        $matching_rules = [];

        foreach ( $all_rules as $rule ) {
            $settings = $rule['settings'] ?? [];
            $trigger_type = $settings['when_customer_views_type'] ?? 'category';
            $trigger_value = $settings['when_customer_views_value'] ?? '';

            $matches = false;

            switch ( $trigger_type ) {
                case 'product':
                    $matches = ( (string) $product_id === (string) $trigger_value );
                    break;

                case 'category':
                    if ( ! empty( $category_ids )) {
                        $category_slugs = array_map( function( $cat_id ) {
                            $term = get_term( $cat_id );
                            return $term ? $term->slug : '';
                        }, $category_ids );
                        $matches = in_array( $trigger_value, $category_slugs, true );
                    }
                    break;

                case 'tag':
                    if ( ! empty( $tag_ids )) {
                        $tag_slugs = array_map( function( $tag_id ) {
                            $term = get_term( $tag_id );
                            return $term ? $term->slug : '';
                        }, $tag_ids );
                        $matches = in_array( $trigger_value, $tag_slugs, true );
                    }
                    break;
            }

            if ( $matches ) {
                $matching_rules[] = $rule;
            }
        }

        // Sort by priority if available
        usort( $matching_rules, function( $a, $b ) {
            $priority_a = $a['priority'] ?? 10;
            $priority_b = $b['priority'] ?? 10;
            return $priority_a - $priority_b;
        });

        return $matching_rules;
    }

    /**
     * Get recommended products based on rule
     *
     * @param array $rule Recommendation rule
     * @param WC_Product $current_product Current product being viewed
     * @return array Recommended products
     */
    protected function get_recommended_products( $rule, $current_product ): array {
        $settings = $rule['settings'] ?? [];
        $recommend_type = $settings['recommend_products_from_type'] ?? 'category';
        $recommend_values = $settings['recommend_products_from_value'] ?? [];
        $max_products = (int) ( $settings['max_products_to_show'] ?? 3 );
        $sort_by = $settings['sort_by'] ?? 'best_selling';

        if ( ! is_array( $recommend_values )) {
            $recommend_values = [ $recommend_values ];
        }

        $query_args = [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => $max_products * 2, // Get more to filter out cart items
            'post__not_in'   => [ $current_product->get_id() ], // Exclude current product
            'meta_query'     => [
                [
                    'key'     => '_stock_status',
                    'value'   => 'instock',
                    'compare' => '=',
                ],
            ],
        ];

        // Add taxonomy query based on recommend type
        switch ( $recommend_type ) {
            case 'category':
                $query_args['tax_query'] = [
                    [
                        'taxonomy' => 'product_cat',
                        'field'    => 'slug',
                        'terms'    => $recommend_values,
                    ],
                ];
                break;

            case 'tag':
                $query_args['tax_query'] = [
                    [
                        'taxonomy' => 'product_tag',
                        'field'    => 'slug',
                        'terms'    => $recommend_values,
                    ],
                ];
                break;

            case 'product':
                $product_ids = array_map( 'intval', $recommend_values );
                $query_args['post__in'] = $product_ids;
                break;
        }

        // Add sorting
        switch ( $sort_by ) {
            case 'best_selling':
                $query_args['meta_key'] = 'total_sales';
                $query_args['orderby'] = 'meta_value_num';
                $query_args['order'] = 'DESC';
                break;

            case 'newest':
                $query_args['orderby'] = 'date';
                $query_args['order'] = 'DESC';
                break;

            case 'price_low':
                $query_args['meta_key'] = '_price';
                $query_args['orderby'] = 'meta_value_num';
                $query_args['order'] = 'ASC';
                break;

            case 'price_high':
                $query_args['meta_key'] = '_price';
                $query_args['orderby'] = 'meta_value_num';
                $query_args['order'] = 'DESC';
                break;

            default:
                $query_args['orderby'] = 'rand';
        }

        $products_query = new \WP_Query( $query_args );
        $products = [];

        if ( $products_query->have_posts()) {
            while ( $products_query->have_posts()) {
                $products_query->the_post();
                $product = wc_get_product( get_the_ID());

                if ( $product && $this->should_show_product( $product, $settings )) {
                    $products[] = $product;

                    if ( count( $products ) >= $max_products ) {
                        break;
                    }
                }
            }
            wp_reset_postdata();
        }

        return $products;
    }

    /**
     * Check if product should be shown based on cart behavior setting
     *
     * @param WC_Product $product Product to check
     * @param array $settings Rule settings
     * @return bool Whether to show the product
     */
    protected function should_show_product( $product, $settings ): bool {
        $behavior = $settings['behavior_if_in_cart'] ?? 'hide';

        if ( $behavior === 'show' ) {
            return true;
        }

        // Check if product is in cart
        if ( ! WC()->cart ) {
            return true;
        }

        foreach ( WC()->cart->get_cart() as $cart_item ) {
            if ( $cart_item['product_id'] === $product->get_id()) {
                return false; // Hide if in cart
            }
        }

        return true;
    }

    /**
     * Render recommendation section
     *
     * @param array $rule Recommendation rule
     * @param array $products Recommended products
     * @return void
     */
    protected function render_recommendation_section( $rule, $products ): void {
        $settings = $rule['settings'] ?? [];
        $section_title = $settings['section_title'] ?? __( 'Pairs perfectly with', 'yayboost' );
        $layout = $settings['layout'] ?? 'grid';

        $template_path = plugin_dir_path( __FILE__ ) . 'templates/recommendation-section.php';

        if ( file_exists( $template_path )) {
            include $template_path;
        }
    }

    /**
     * AJAX handler to get updated recommendations
     *
     * @return void
     */
    public function ajax_get_recommendations(): void {
        global $product;

        check_ajax_referer( 'yayboost_recommendations', 'nonce' );

        $product_id = (int) ( $_POST['product_id'] ?? 0 );

        if ( ! $product_id ) {
            wp_send_json_error( 'Invalid product ID' );
        }

        $product = wc_get_product( $product_id );

        if ( ! $product ) {
            wp_send_json_error( 'Product not found' );
        }

        $original_product = $product;

        $product = wc_get_product( $product_id );

        ob_start();
        $this->render_recommendations();
        $html = ob_get_clean();

        // Restore original product
        $product = $original_product;

        wp_send_json_success( [ 'html' => $html ] );
    }

    /**
     * AJAX handler to add recommended product to cart
     *
     * @return void
     */
    public function ajax_add_to_cart_recommendation(): void {
        check_ajax_referer( 'yayboost_recommendations', 'nonce' );

        $product_id = (int) ( $_POST['product_id'] ?? 0 );
        $quantity = (int) ( $_POST['quantity'] ?? 1 );
        $variation_id = (int) ( $_POST['variation_id'] ?? 0 );

        if ( ! $product_id ) {
            wp_send_json_error( 'Invalid product ID' );
        }

        $result = WC()->cart->add_to_cart( $product_id, $quantity, $variation_id );

        if ( $result ) {
            wp_send_json_success([
                'message' => __( 'Product added to cart', 'yayboost' ),
                'cart_count' => WC()->cart->get_cart_contents_count(),
            ]);
        } else {
            wp_send_json_error( 'Failed to add product to cart' );
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
                'show_on_product_page' => true,
                'show_on_cart_page'    => false,
                'show_on_mini_cart'    => false,
                'layout'               => 'grid',
                'section_title'        => __( 'Pairs perfectly with', 'yayboost' ),
                'behavior_if_in_cart'  => 'hide',
            ]
        );
    }
}
