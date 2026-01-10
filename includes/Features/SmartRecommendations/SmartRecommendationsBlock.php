<?php
/**
 * Smart Recommendations Gutenberg Block
 *
 * Registers the Smart Recommendations block.
 * - Editor: Data localized via enqueue_block_editor_assets
 * - Frontend: Data passed via wp_interactivity_state() in render.php
 *
 * @package YayBoost
 */

namespace YayBoost\Features\SmartRecommendations;

/**
 * Smart Recommendations Block class
 */
class SmartRecommendationsBlock {

    /**
     * Feature instance
     *
     * @var SmartRecommendationsFeature
     */
    private $feature;

    /**
     * Constructor
     *
     * @param SmartRecommendationsFeature $feature Feature instance.
     */
    public function __construct( SmartRecommendationsFeature $feature ) {
        $this->feature = $feature;

        add_action( 'init', [ $this, 'register_block' ] );
		
		add_filter( 'render_block', array( $this, 'add_display_layout_attribute' ), 10, 3 );

		add_filter(
			'query_loop_block_query_vars',
			array( $this, 'build_frontend_query' ),
			100,
			3
		);

		add_filter(
			'rest_product_query',
			array( $this, 'build_editor_query' ),
			100,
			2
		);
    }

    /**
     * Get feature instance
     *
     * @return SmartRecommendationsFeature|null
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
        $block_json_path = YAYBOOST_PATH . 'assets/dist/blocks/smart-recommendations/block.json';

        if ( ! file_exists( $block_json_path ) ) {
            return;
        }

        // Register block with feature context for render.php
        // Frontend data localization handled via wp_interactivity_state() in render.php
        register_block_type(
            $block_json_path,
            []
        );
    }

	public function build_frontend_query( $query, $block, $page ) {
		$is_smart_recommendations_query = $block->context['query']['isSmartRecommendationsQuery'] ?? false;
		
        if ( ! $is_smart_recommendations_query ) {
			return $query;
        }
		
        // Get current product
		global $product;
        if ( ! $product || ! $product instanceof \WC_Product ) {
            return $query;
        }

        $current_product = $product;

        $matching_rules = $this->feature->get_matching_rules( $current_product );

        if ( empty( $matching_rules ) ) {
            $query['post__in'] = [ 0 ]; 
            return $query;
        }

        $all_recommended_ids = [];
        
        foreach ( $matching_rules as $rule ) {
            if ( ( $rule['status'] ?? 'active' ) !== 'active' ) {
                continue;
            }

            $recommended_products = $this->feature->get_recommended_products( $rule, $current_product );

            foreach ( $recommended_products as $recommended_product ) {
                if ( $recommended_product instanceof \WC_Product ) {
                    $all_recommended_ids[] = $recommended_product->get_id();
                }
            }
        }

        $all_recommended_ids = array_unique( $all_recommended_ids );

        if ( empty( $all_recommended_ids ) ) {
            $query['post__in'] = [ 0 ];
            return $query;
        }

        // Set the product IDs in the query
        $query['post__in'] = $all_recommended_ids;

        // Disable pagination - show all recommended products
        $query['posts_per_page'] = -1;
        $query['nopaging']       = true;

        return $query;
	}

	public function build_editor_query( $query, $request ) {
        $is_smart_recommendations = $request->get_param( 'isSmartRecommendationsQuery' );

        if ( ! $is_smart_recommendations ) {
            return $query;
        }

        $items = get_posts(
            [
                'post_type'      => 'product',
                'posts_per_page' => 3,
                'orderby'        => 'date',
                'order'          => 'DESC',
            ]
        );

        $items = array_map(
            function ( $product ) {
                return $product->ID;
            },
            $items
        );

        $query['post__in']       = $items;
        $query['posts_per_page'] = 4;
        $query['nopaging']       = true;
        $query['paged']          = 1;

        return $query;
	}

	public function add_display_layout_attribute( $block_content, $block ) {
		global $product;

		if ( ! is_array( $block ) ) {
			return $block_content;
		}

		if ( ! isset( $block['blockName'] ) || $block['blockName'] !== "yayboost/smart-recommendations" ) {
			return $block_content;
		}

		$matching_rules = $this->feature->get_matching_rules( $product );

		if ( empty( $matching_rules ) ) {
			return $block_content;
		}

		$first_rule = $matching_rules[0];
		$layout = 'list' === $first_rule['settings']['layout'] ? '__list' : '__grid';
		$section_title = $first_rule['settings']['section_title'] ?? 'Test';

		$tags = new \WP_HTML_Tag_Processor( $block_content );

		if ( $tags->next_tag() ) {
			$existing_class = $tags->get_attribute( 'class' );
			$new_class = $existing_class . ' yayboost-recommendations-block' . $layout;

			$tags->set_attribute( 'class', $new_class );
		}

		$block_content = $tags->get_updated_html();

		$h3_html = '<h3 class="yayboost-recommendations__title">' . esc_html( $section_title ) . '</h3>';

		$block_content = $h3_html . $block_content;

		return $block_content;
	}
}