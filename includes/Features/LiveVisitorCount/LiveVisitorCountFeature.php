<?php
/**
 * Live Visitor Count Feature
 *
 * Displays a live visitor count on single product pages.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\LiveVisitorCount;

use YayBoost\Features\AbstractFeature;
use YayBoost\Shared\DisplayPosition\DisplayPositionService;

defined( 'ABSPATH' ) || exit;
/**
 * Live Visitor Count feature implementation
 */
class LiveVisitorCountFeature extends AbstractFeature {

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'live_visitor_count';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Live Visitor Count';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display a short text with the number of visitors viewing the current page';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'others';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'users';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 1;

    /**
     * Tracker instance
     *
     * @var LiveVisitorCountTracker
     */
    private $tracker;

    /**
     * Renderer instance
     *
     * @var LiveVisitorCountRenderer
     */
    private $renderer;

    /**
     * AJAX handler instance
     *
     * @var LiveVisitorCountAjaxHandler
     */
    private $ajax_handler;

    /**
     * Display position service
     *
     * @var DisplayPositionService
     */
    private DisplayPositionService $position_service;

    /**
     * Allowed positions for this feature (empty = all)
     *
     * @var array
     */
    protected array $allowed_positions = [
        'below_price',
        'above_add_to_cart_button',
        'below_add_to_cart_button',
    ];

    /**
     * Constructor
     *
     * @param \YayBoost\Container\Container $container DI container.
     */
    public function __construct( $container ) {
        parent::__construct( $container );

        // Initialize services
        $this->position_service = new DisplayPositionService();

        // Initialize modules
        $this->tracker      = new LiveVisitorCountTracker( $this );
        $this->renderer     = new LiveVisitorCountRenderer( $this, $this->tracker );
        $this->ajax_handler = new LiveVisitorCountAjaxHandler( $this->tracker );

        // Register AJAX hooks
        $this->ajax_handler->register_hooks();
    }

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        if ( ! $this->is_enabled() ) {
            return;
        }

        // Register hooks after query is parsed
        add_action( 'wp', [ $this, 'register_product_hooks' ] );

        // Initialize block
        new LiveVisitorCountBlock( $this );
    }

    /**
     * Register product-specific hooks after query is parsed
     *
     * @return void
     */
    public function register_product_hooks(): void {
        if ( ! function_exists( 'is_product' ) || ! is_product() ) {
            return;
        }

        $position = $this->get( 'display.position' );

        $this->position_service->register_hook(
            DisplayPositionService::PAGE_PRODUCT,
            $position,
            [ $this, 'render_content' ]
        );
    }

    /**
     * Get position options for admin UI
     *
     * @return array Options array with value/label pairs.
     */
    public function get_position_options(): array {
        return $this->position_service->get_options_for_select(
            DisplayPositionService::PAGE_PRODUCT,
            $this->allowed_positions,
            true
            // Include "Use Block" option
        );
    }

    /**
     * Check if the feature should apply to the current product
     *
     * @return bool True if feature should apply.
     */
    public function should_apply_to_product( $product_id = null ): bool {
        $apply = $this->get( 'apply_on.apply' );

        if ( 'all' === $apply ) {
            return true;
        }

        if ( ! $product_id ) {
            $product_id = get_the_ID();
        }

        $product = wc_get_product( $product_id );

        if ( ! $product ) {
            return false;
        }

        if ( ! ( $product instanceof \WC_Product ) ) {
            return false;
        }

        if ( 'specific_products' === $apply ) {
            return $this->matches_specific_products( $product_id );
        }

        if ( 'specific_categories' === $apply ) {
            return $this->matches_specific_categories( $product_id );
        }

        return false;
    }

    /**
     * Check if product matches specific products setting
     *
     * @param int $product_id Product ID.
     * @return bool True if matches.
     */
    private function matches_specific_products( int $product_id ): bool {
        $specific_products = $this->get( 'apply_on.products' ) ?? [];
        if ( empty( $specific_products ) ) {
            return false;
        }

        $specific_products = array_map( 'intval', $specific_products );
        return in_array( $product_id, $specific_products, true );
    }

    /**
     * Check if product matches specific categories setting
     *
     * @param int $product_id Product ID.
     * @return bool True if matches.
     */
    private function matches_specific_categories( int $product_id ): bool {
        $specific_categories = $this->get( 'apply_on.categories' ) ?? [];
        if ( empty( $specific_categories ) ) {
            return false;
        }
        $categories = [];
        // $specific_categories = array_map( 'intval', $specific_categories );
        foreach ( $specific_categories as $category ) {
            $category = get_term_by( 'slug', $category, 'product_cat' );
            if ( $category ) {
                $categories[] = $category->term_id;
                // if category has children, add them to the categories array
                $children = get_term_children( $category->term_id, 'product_cat' );
                if ( ! empty( $children ) ) {
                    $categories = array_merge( $categories, $children );
                }
            }
        }

        if ( empty( $categories ) ) {
            return false;
        }

        $product_categories = wp_get_post_terms( $product_id, 'product_cat', [ 'fields' => 'ids' ] );

        if ( is_wp_error( $product_categories ) ) {
            return false;
        }

        return ! empty( array_intersect( array_map( 'intval', $product_categories ), $categories ) );
    }

    /**
     * Render visitor count content (delegated to renderer)
     *
     * @return void
     */
    public function render_content(): void {

        $product_id = get_the_ID();

        $this->renderer->render( $product_id );
    }

    /**
     * Get default settings
     *
     * @return array Default settings.
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'       => true,
                'tracking_mode' => 'real-tracking',
                'real_tracking' => [
                    'active_window'         => 5,
                    'minimum_count_display' => 1,
                ],
                'simulated'     => [
                    'min' => 10,
                    'max' => 50,
                ],
                'display'       => [
                    'text'     => '👁️ {count} visitors are viewing this product',
                    'position' => 'below_product_title',
                ],
                'style'         => [
                    'style'            => 'style_1',
                    'text_color'       => '#000000',
                    'background_color' => '#efefef',
                ],
                'apply_on'      => [
                    'apply'      => 'all',
                    'categories' => [],
                    'products'   => [],
                ],
            ]
        );
    }

    public function get_renderer(): LiveVisitorCountRenderer {
        return $this->renderer;
    }
}
