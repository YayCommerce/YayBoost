<?php
/**
 * Recommendation Repository
 *
 * Handle database operations for recommendation rules
 *
 * @package YayBoost
 */

namespace YayBoost\Features\SmartRecommendations;

use YayBoost\Repository\EntityRepository;

/**
 * Repository for managing recommendation rules
 */
class RecommendationRepository extends EntityRepository {

    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct( 'smart_recommendations', 'recommendation' );
    }

    /**
     * Get all active recommendation rules
     *
     * @return array Active rules
     */
    public function get_active_rules(): array {
        global $wpdb;

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->get_table()} 
                WHERE feature_id = %s 
                AND entity_type = %s 
                AND status = 'active'
                ORDER BY priority ASC, id ASC",
                $this->feature_id,
                $this->entity_type
            ),
            ARRAY_A
        );

        if ( ! $results ) {
            return [];
        }

        // Decode settings JSON
        foreach ( $results as &$result ) {
            if ( ! empty( $result['settings'] )) {
                $result['settings'] = json_decode( $result['settings'], true );
            }
        }

        return $results;
    }

    /**
     * Get rules that match a specific product
     *
     * @param int $product_id Product ID
     * @return array Matching rules
     */
    public function get_rules_for_product( int $product_id ): array {
        $product = wc_get_product( $product_id );
        
        if ( ! $product ) {
            return [];
        }

        $all_rules = $this->get_active_rules();
        $matching_rules = [];

        $category_ids = $product->get_category_ids();
        $tag_ids = wp_get_post_terms( $product_id, 'product_tag', [ 'fields' => 'ids' ] );

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

        return $matching_rules;
    }

    /**
     * Get products based on recommendation criteria
     *
     * @param array $criteria Recommendation criteria
     * @param int $exclude_product_id Product to exclude from results
     * @return array Product IDs
     */
    public function get_products_by_criteria( array $criteria, int $exclude_product_id = 0 ): array {
        $recommend_type = $criteria['recommend_products_from_type'] ?? 'category';
        $recommend_values = $criteria['recommend_products_from_value'] ?? [];
        $max_products = (int) ( $criteria['max_products_to_show'] ?? 3 );
        $sort_by = $criteria['sort_by'] ?? 'best_selling';

        if ( ! is_array( $recommend_values )) {
            $recommend_values = [ $recommend_values ];
        }

        $query_args = [
            'post_type'      => 'product',
            'post_status'    => 'publish',
            'posts_per_page' => $max_products * 2, // Get more to allow filtering
            'fields'         => 'ids',
            'meta_query'     => [
                [
                    'key'     => '_stock_status',
                    'value'   => 'instock',
                    'compare' => '=',
                ],
            ],
        ];

        // Exclude current product
        if ( $exclude_product_id ) {
            $query_args['post__not_in'] = [ $exclude_product_id ];
        }

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

            case 'price_low_high':
                $query_args['meta_key'] = '_price';
                $query_args['orderby'] = 'meta_value_num';
                $query_args['order'] = 'ASC';
                break;

            case 'price_high_low':
                $query_args['meta_key'] = '_price';
                $query_args['orderby'] = 'meta_value_num';
                $query_args['order'] = 'DESC';
                break;

            default:
                $query_args['orderby'] = 'rand';
        }

        $products_query = new \WP_Query( $query_args );
        
        return $products_query->posts ?? [];
    }

    /**
     * Get recommendation statistics
     *
     * @return array Statistics data
     */
    public function get_statistics(): array {
        global $wpdb;

        $total_rules = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->get_table()} 
                WHERE feature_id = %s AND entity_type = %s",
                $this->feature_id,
                $this->entity_type
            )
        );

        $active_rules = $wpdb->get_var(
            $wpdb->prepare(
                "SELECT COUNT(*) FROM {$this->get_table()} 
                WHERE feature_id = %s AND entity_type = %s AND status = 'active'",
                $this->feature_id,
                $this->entity_type
            )
        );

        return [
            'total_rules'  => (int) $total_rules,
            'active_rules' => (int) $active_rules,
        ];
    }
}
