<?php
/**
 * Purchase Activity Count Feature
 *
 * Displays a purchase activity count on single product pages or category pages.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PurchaseActivityCount;

use YayBoost\Features\AbstractFeature;
use YayBoost\Shared\DisplayPosition\DisplayPositionService;

/**
 * Purchase Activity Count feature implementation
 */
class PurchaseActivityCountFeature extends AbstractFeature {

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'purchase_activity_count';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Purchase Activity Count';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Display a short text with the number of purchases processed for the current product or category';

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
    protected $icon = 'scroll';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 1;

    /**
     * Tracker instance
     *
     * @var PurchaseActivityCountTracker
     */
    private $tracker;

    /**
     * Renderer instance
     *
     * @var PurchaseActivityCountRenderer
     */
    private $renderer;

    /**
     * AJAX handler instance
     *
     * @var PurchaseActivityCountAjaxHandler
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
        'below_product_title',
        'below_price',
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
        $this->tracker  = new PurchaseActivityCountTracker( $this );
        $this->renderer = new PurchaseActivityCountRenderer( $this, $this->tracker );
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
        add_action( 'wp', [ $this, 'register_product_and_shop_hooks' ] );
        add_action( 'woocommerce_new_order', [ $this, 'handle_new_order' ], 10, 2 );

        // Initialize block
        new PurchaseActivityCountBlock( $this );
    }

    /**
     * Register product-specific hooks after query is parsed
     *
     * @return void
     */
    public function register_product_and_shop_hooks(): void {
        $show_on_product_page = $this->get( 'display.show_on_product_page' );
        $show_on_shop_page    = $this->get( 'display.show_on_shop_page' );
        $position             = $this->get( 'display.position' );
        // Register product page hooks
        if ( $show_on_product_page ) {
            $this->position_service->register_hook(
                DisplayPositionService::PAGE_PRODUCT,
                $position,
                [ $this, 'render_content' ]
            );
        }
        // Register shop page hooks
        if ( $show_on_shop_page ) {
            $this->position_service->register_mapped_hook(
                $position,
                DisplayPositionService::PAGE_PRODUCT,
                DisplayPositionService::PAGE_SHOP,
                [ $this, 'render_content' ],
                'after_shop_loop_item'
                // fallback
            );
        }
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
            false
        );
    }

    /**
     * Check if the feature should apply to the current product
     *
     * @return bool True if feature should apply.
     */
    public function should_apply_to_current_product(): bool {
        return $this->should_apply_to_product( get_the_ID() ?: 0 );
    }

    /**
     * Check if the feature should apply to a specific product
     *
     * @param int $product_id Product ID (e.g. from block context when inside product-template).
     * @return bool True if feature should apply.
     */
    public function should_apply_to_product( int $product_id ): bool {
        if ( ! $product_id ) {
            return false;
        }

        $apply = $this->get( 'target_products.apply' );

        if ( 'all' === $apply || 'specific_categories' === $apply ) {
            $exclude = $this->get( 'target_products.exclude' ) ?? [];
            $exclude = array_map( 'intval', $exclude );
            if ( ! empty( $exclude ) && in_array( $product_id, $exclude, true ) ) {
                return false;
            }
        }

        if ( 'specific_products' === $apply ) {
            return $this->matches_specific_products( $product_id );
        }

        if ( 'specific_categories' === $apply ) {
            return $this->matches_specific_categories( $product_id );
        }

        return true;
    }

    /**
     * Check if product matches specific products setting
     *
     * @param int $product_id Product ID.
     * @return bool True if matches.
     */
    private function matches_specific_products( int $product_id ): bool {
        $specific_products = $this->get( 'target_products.products' ) ?? [];
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
        $specific_categories = $this->get( 'target_products.categories' ) ?? [];

        if ( empty( $specific_categories ) ) {
            return false;
        }
        $categories = [];

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
        $this->renderer->render();
    }

    /**
     * Get rendered content (for block rendering)
     *
     * @param int|null $product_id Optional. Product ID when block is inside product-template. Null for current post/product.
     * @return string HTML content.
     */
    public function get_content( ?int $product_id = null ): string {
        return $this->renderer->get_content( $product_id );
    }

    /**
     * Get rendered content for a specific product (e.g. when block is inside product-template)
     *
     * @param int $product_id Product ID from block context.
     * @return string HTML content or empty string if should not apply.
     */
    public function get_content_for_product( int $product_id ): string {
        if ( ! $this->should_apply_to_product( $product_id ) ) {
            return '';
        }
        return $this->renderer->get_content( $product_id );
    }

    /**
     * Enqueue frontend assets (for block rendering)
     *
     * @return void
     */
    public function enqueue_assets(): void {
        $this->renderer->enqueue_assets();
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
                'enabled'               => true,
                'minimum_count_display' => 3,
                'count_from'            => 'all',
                'display'               => [
                    'text'                 => '{count} bought this product',
                    'position'             => 'below_price',
                    'show_on_product_page' => true,
                    'show_on_shop_page'    => false,
                ],
                'target_products'       => [
                    'apply'      => 'all',
                    'categories' => [],
                    'products'   => [],
                    'exclude'    => [],
                ],
            ]
        );
    }

    /**
     * Handle new order
     *
     * @param int       $order_id Order ID.
     * @param \WC_Order $order Order object.
     * @return void
     */
    public function handle_new_order( int $order_id, \WC_Order $order ): void {
        $products = $order->get_items();
        foreach ( $products as $product ) {
            $product_id = ! empty( $product->get_variation_id() ) ? $product->get_variation_id() : $product->get_product_id();
            if ( $product_id ) {
                $this->tracker->update_purchase_activity_count( $product_id );
            }
        }
    }
}
