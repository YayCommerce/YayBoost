<?php

/**
 * Product Data REST API Controller
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;

/**
 * Handles product-related data fetching for admin settings
 */
class ProductDataController extends BaseController {

    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes(): void {
        // Get product categories
        $this->register_route(
            '/product-data/categories',
            WP_REST_Server::READABLE,
            [ $this, 'get_categories' ]
        );

        // Get products by IDs (for displaying selected products)
        $this->register_route(
            '/product-data/products',
            WP_REST_Server::READABLE,
            [ $this, 'get_products' ]
        );

        // Get single product (e.g. for price in bump editor)
        $this->register_route(
            '/product-data/products/(?P<id>\d+)',
            WP_REST_Server::READABLE,
            [ $this, 'get_product' ]
        );

        // Get product tags
        $this->register_route(
            '/product-data/tags',
            WP_REST_Server::READABLE,
            [ $this, 'get_tags' ]
        );
    }

    /**
     * Get product categories
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_categories(WP_REST_Request $request) {
        $categories = get_terms(
            [
                'taxonomy'   => 'product_cat',
                'hide_empty' => false,
                'orderby'    => 'name',
                'order'      => 'ASC',
            ]
        );

        if (is_wp_error( $categories )) {
            return $this->error( 'Failed to fetch categories', 500 );
        }

        $formatted = array_map(
            function ($cat) {
                $label = $cat->name;

                // Build full hierarchy path if category has parents
                $ancestors = get_ancestors( $cat->term_id, 'product_cat', 'taxonomy' );
                if ( ! empty( $ancestors )) {
                    // Ancestors are returned from immediate parent to root, so reverse them
                    $ancestors      = array_reverse( $ancestors );
                    $ancestor_names = array_map(
                        function ($ancestor_id) {
                            $ancestor = get_term( $ancestor_id, 'product_cat' );
                            return $ancestor ? $ancestor->name : '';
                        },
                        $ancestors
                    );
                    $ancestor_names = array_filter( $ancestor_names );
                    $label          = implode( ' > ', $ancestor_names ) . ' > ' . $cat->name;
                }

                return [
                    'value' => $cat->slug,
                    'label' => $label,
                ];
            },
            $categories
        );

        return $this->success( $formatted );
    }

    /**
     * Get products with optional search
     * - No search: return first 20 products
     * - With search: return all matching products
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_products(WP_REST_Request $request) {
        $search    = sanitize_text_field( $request->get_param( 'search' ) ?? '' );
        $hasSearch = ! empty( $search );

        $args = [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => $hasSearch ? -1 : 10,
            'orderby'        => 'title',
            'order'          => 'ASC',
        ];

        // Add search if provided
        if ($hasSearch) {
            $args['s'] = $search;
            // WHERE post_title LIKE '%search%'
        }

        $query = new \WP_Query( $args );

        $products = array_map(
            function ($post) {
                return [
                    'value' => (string) $post->ID,
                    'label' => $post->post_title,
                ];
            },
            $query->posts
        );

        return $this->success( $products );
    }

    /**
     * Get single product by ID (includes regular_price for bump pricing)
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_product(WP_REST_Request $request) {
        $id = (int) $request->get_param( 'id' );
        if ( ! $id) {
            return $this->error( 'Invalid product ID', 400 );
        }

        if ( ! function_exists( 'wc_get_product' )) {
            return $this->error( 'WooCommerce not available', 500 );
        }

        $product = wc_get_product( $id );
        if ( ! $product || ! is_a( $product, 'WC_Product' )) {
            return $this->error( 'Product not found', 404 );
        }

        $regular_price = (float) $product->get_regular_price();
        if ($regular_price === 0.0 && $product->get_regular_price() === '') {
            $regular_price = (float) $product->get_price();
        }

        $image_url = null;
        $image_id = $product->get_image_id();
        if ( $image_id ) {
            $image_url = wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
            if ( ! $image_url ) {
                $image_url = wp_get_attachment_image_url( $image_id, 'thumbnail' );
            }
        }

        $data = [
            'value'          => (string) $id,
            'label'          => $product->get_name(),
            'regular_price'  => $regular_price,
            'image'          => $image_url ?: null,
        ];

        return $this->success( $data );
    }

    /**
     * Get product tags (WooCommerce product_tag taxonomy)
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_tags(WP_REST_Request $request) {
        $tags = get_terms(
            [
                'taxonomy'   => 'product_tag',
                'hide_empty' => false,
                'orderby'    => 'name',
                'order'      => 'ASC',
            ]
        );

        if (is_wp_error( $tags )) {
            return $this->error( 'Failed to fetch tags', 500 );
        }

        $formatted = array_map(
            function ($term) {
                return [
                    'value' => (string) $term->term_id,
                    'label' => $term->name,
                ];
            },
            $tags
        );

        return $this->success( $formatted );
    }
}
