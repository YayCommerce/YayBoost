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
     * Cache manager instance
     *
     * @var FBTCacheManager
     */
    private $cache_manager;

    /**
     * Collector instance
     *
     * @var FBTCollector
     */
    private $collector;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        if ( ! $this->is_enabled() ) {
            return;
        }

        // Initialize components
        $this->cache_manager = new FBTCacheManager();
        $this->collector     = new FBTCollector( $this->cache_manager );

        // Register hooks
        $this->register_hooks();
    }

    /**
     * Register WordPress hooks
     *
     * @return void
     */
    private function register_hooks(): void {
        // Frontend display hook
        add_action( 'woocommerce_after_single_product_summary', [ $this, 'render_fbt_section' ], 15 );

        // Order completed hook for data collection
        add_action( 'woocommerce_order_status_completed', [ $this, 'on_order_completed' ], 10, 1 );

        // AJAX handler registration
        $ajax_handler = new FBTAjaxHandler();
        $ajax_handler->register();
    }

    /**
     * Render FBT section on single product page
     *
     * @return void
     */
    public function render_fbt_section(): void {
        if ( ! is_product() ) {
            return;
        }

        global $product;
        if ( ! $product ) {
            return;
        }

        $product_id = $product->get_id();

        // Use parent ID for variations
        if ( $product->is_type( 'variation' ) ) {
            $product_id = $product->get_parent_id();
        }

        $renderer = new FBTRenderer( $this->cache_manager, $this->get_settings() );
        $renderer->render( $product_id );
    }

    /**
     * Handle order completed event
     *
     * @param int $order_id Order ID
     * @return void
     */
    public function on_order_completed( int $order_id ): void {
        $this->collector->process_order( $order_id );
    }

    /**
     * Get cache manager instance
     *
     * @return FBTCacheManager
     */
    public function get_cache_manager(): FBTCacheManager {
        if ( ! $this->cache_manager ) {
            $this->cache_manager = new FBTCacheManager();
        }
        return $this->cache_manager;
    }

    /**
     * Get collector instance
     *
     * @return FBTCollector
     */
    public function get_collector(): FBTCollector {
        if ( ! $this->collector ) {
            $this->collector = new FBTCollector( $this->get_cache_manager() );
        }
        return $this->collector;
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
                'section_title'       => __( 'Frequently Bought Together', 'yayboost' ),
                'hide_if_in_cart'     => 'hide',
            ]
        );
    }

    /**
     * Update feature settings and invalidate cache
     *
     * Override parent to invalidate FBT cache when settings change
     * (e.g., max_products, min_order_threshold).
     *
     * @param array $settings New settings
     * @return void
     */
    public function update_settings( array $settings ): void {
        parent::update_settings( $settings );

        // Invalidate all FBT cache when settings change
        $this->get_cache_manager()->invalidate_all();
    }
}
