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
class ProductDataController extends BaseController
{
    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes(): void
    {
        // Get product categories
        $this->register_route(
            '/product-data/categories',
            WP_REST_Server::READABLE,
            [$this, 'get_categories']
        );

        // Get products by IDs (for displaying selected products)
        $this->register_route(
            '/product-data/products',
            WP_REST_Server::READABLE,
            [$this, 'get_products']
        );
    }

    /**
     * Get product categories
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_categories(WP_REST_Request $request)
    {
        $categories = get_terms([
            'taxonomy'   => 'product_cat',
            'hide_empty' => false,
            'orderby'    => 'name',
            'order'      => 'ASC',
        ]);

        if (is_wp_error($categories)) {
            return $this->error('Failed to fetch categories', 500);
        }

        $formatted = array_map(function ($cat) {
            $label = $cat->name;

            // Build full hierarchy path if category has parents
            $ancestors = get_ancestors($cat->term_id, 'product_cat', 'taxonomy');
            if (!empty($ancestors)) {
                // Ancestors are returned from immediate parent to root, so reverse them
                $ancestors = array_reverse($ancestors);
                $ancestor_names = array_map(function ($ancestor_id) {
                    $ancestor = get_term($ancestor_id, 'product_cat');
                    return $ancestor ? $ancestor->name : '';
                }, $ancestors);
                $ancestor_names = array_filter($ancestor_names);
                $label = implode(' > ', $ancestor_names) . ' > ' . $cat->name;
            }

            return [
                'value' => $cat->slug,
                'label' => $label,
            ];
        }, $categories);

        return $this->success($formatted);
    }

    /**
     * Get products with optional search
     * - No search: return first 20 products
     * - With search: return all matching products
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_products(WP_REST_Request $request)
    {
        $search = sanitize_text_field($request->get_param('search') ?? '');
        $hasSearch = !empty($search);

        $args = [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => $hasSearch ? -1 : 10,
            'orderby'        => 'title',
            'order'          => 'ASC',
        ];

        // Add search if provided
        if ($hasSearch) {
            $args['s'] = $search; // WHERE post_title LIKE '%search%'
        }

        $query = new \WP_Query($args);

        $products = array_map(function ($post) {
            return [
                'value' => (string) $post->ID,
                'label' => $post->post_title,
            ];
        }, $query->posts);

        return $this->success($products);
    }
}
