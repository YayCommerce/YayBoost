<?php
/**
 * Sample Boost Feature - Recently Viewed Products
 *
 * @package YayBoost
 */

namespace YayBoost\Features\SampleBoost;

use YayBoost\Features\AbstractFeature;

/**
 * Sample boost feature that tracks and displays recently viewed products
 */
class SampleBoostFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'sample_boost';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Recently Viewed Products';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Track and display recently viewed products to boost engagement and sales';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'product_discovery';

    /**
     * Feature icon
     *
     * @var string
     */
    protected $icon = 'eye';

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
        // Track product views
        add_action( 'woocommerce_after_single_product', [ $this, 'track_product_view' ] );

        // Display recently viewed products
        add_action( 'woocommerce_after_single_product_summary', [ $this, 'display_recently_viewed' ], 25 );

        // Register shortcode
        add_shortcode( 'yayboost_recently_viewed', [ $this, 'shortcode' ] );

        // Add AJAX endpoint
        add_action( 'wp_ajax_yayboost_get_recently_viewed', [ $this, 'ajax_get_recently_viewed' ] );
        add_action( 'wp_ajax_nopriv_yayboost_get_recently_viewed', [ $this, 'ajax_get_recently_viewed' ] );
    }

    /**
     * Track product view
     *
     * @return void
     */
    public function track_product_view() {
        global $post;

        if ( ! $post || $post->post_type !== 'product') {
            return;
        }

        $settings    = $this->get_settings();
        $maxProducts = isset( $settings['max_products'] ) ? (int) $settings['max_products'] : 10;

        // Get current viewed products from cookie
        $viewed = isset( $_COOKIE['yayboost_recently_viewed'] )
            ? json_decode( stripslashes( $_COOKIE['yayboost_recently_viewed'] ), true )
            : [];

        if ( ! is_array( $viewed )) {
            $viewed = [];
        }

        // Remove current product if already in list
        $viewed = array_filter(
            $viewed,
            function ($id) use ($post) {
                return $id != $post->ID;
            }
        );

        // Add current product to the beginning
        array_unshift( $viewed, $post->ID );

        // Limit to max products
        $viewed = array_slice( $viewed, 0, $maxProducts );

        // Save to cookie (30 days)
        setcookie( 'yayboost_recently_viewed', json_encode( $viewed ), time() + (30 * DAY_IN_SECONDS), '/' );
    }

    /**
     * Display recently viewed products
     *
     * @return void
     */
    public function display_recently_viewed() {
        $settings = $this->get_settings();

        if ( ! isset( $settings['show_on_product_page'] ) || ! $settings['show_on_product_page']) {
            return;
        }

        echo $this->get_recently_viewed_html();
    }

    /**
     * Shortcode handler
     *
     * @param array $atts
     * @return string
     */
    public function shortcode($atts) {
        $atts = shortcode_atts(
            [
                'limit'   => 5,
                'columns' => 4,
            ],
            $atts
        );

        return $this->get_recently_viewed_html( (int) $atts['limit'], (int) $atts['columns'] );
    }

    /**
     * Get recently viewed products HTML
     *
     * @param int $limit
     * @param int $columns
     * @return string
     */
    protected function get_recently_viewed_html($limit = null, $columns = null) {
        global $post;

        $settings = $this->get_settings();
        $limit    = $limit ?: (isset( $settings['display_limit'] ) ? (int) $settings['display_limit'] : 5);
        $columns  = $columns ?: (isset( $settings['columns'] ) ? (int) $settings['columns'] : 4);

        $viewed = isset( $_COOKIE['yayboost_recently_viewed'] )
            ? json_decode( stripslashes( $_COOKIE['yayboost_recently_viewed'] ), true )
            : [];

        if ( ! is_array( $viewed ) || empty( $viewed )) {
            return '';
        }

        // Exclude current product
        if ($post && $post->post_type === 'product') {
            $viewed = array_filter(
                $viewed,
                function ($id) use ($post) {
                    return $id != $post->ID;
                }
            );
        }

        // Limit results
        $viewed = array_slice( $viewed, 0, $limit );

        if (empty( $viewed )) {
            return '';
        }

        ob_start();
        ?>
        <div class="yayboost-recently-viewed">
            <h2><?php echo esc_html( $settings['title'] ?? __( 'Recently Viewed Products', 'yayboost' ) ); ?></h2>
            
            <ul class="products columns-<?php echo esc_attr( $columns ); ?>">
                <?php
                foreach ($viewed as $product_id) {
                    $product = wc_get_product( $product_id );

                    if ( ! $product) {
                        continue;
                    }

                    wc_get_template_part( 'content', 'product' );
                }
                ?>
            </ul>
        </div>
        <?php

        return ob_get_clean();
    }

    /**
     * AJAX handler to get recently viewed products
     *
     * @return void
     */
    public function ajax_get_recently_viewed() {
        $viewed = isset( $_COOKIE['yayboost_recently_viewed'] )
            ? json_decode( stripslashes( $_COOKIE['yayboost_recently_viewed'] ), true )
            : [];

        if ( ! is_array( $viewed )) {
            $viewed = [];
        }

        $products = [];

        foreach ($viewed as $product_id) {
            $product = wc_get_product( $product_id );

            if ( ! $product) {
                continue;
            }

            $products[] = [
                'id'        => $product->get_id(),
                'name'      => $product->get_name(),
                'price'     => $product->get_price_html(),
                'image'     => wp_get_attachment_image_src( $product->get_image_id(), 'thumbnail' ),
                'permalink' => $product->get_permalink(),
            ];
        }

        wp_send_json_success( $products );
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
                'max_products'         => 10,
                'display_limit'        => 5,
                'columns'              => 4,
                'show_on_product_page' => true,
                'title'                => __( 'Recently Viewed Products', 'yayboost' ),
            ]
        );
    }
}

