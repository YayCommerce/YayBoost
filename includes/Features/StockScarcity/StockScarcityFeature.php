<?php
/**
 * Smart Recommendations Feature
 *
 * Stream music and manage playlists for your workspace..
 *
 * @package YayBoost
 */

namespace YayBoost\Features\StockScarcity;

use YayBoost\Features\AbstractFeature;
use YayBoost\Analytics\AnalyticsTracker;
use YayBoost\Shared\DisplayPosition\DisplayPositionService;

/**
 * Free Shipping Bar feature implementation
 */
class StockScarcityFeature extends AbstractFeature {
    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'stock_scarcity';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Stock Scarcity';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Manage how stock scarcity indicators appear on your store';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'urgency_scarcity';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'hourglass-high';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 1;

    /**
     * Display position service
     *
     * @var DisplayPositionService
     */
    private DisplayPositionService $position_service;

    /**
     * Allowed positions for product page
     *
     * @var array
     */
    protected array $product_positions = [
        'below_price',
        'below_add_to_cart_button',
    ];

    /**
     * Allowed positions for shop page
     *
     * @var array
     */
    protected array $shop_positions = [
        'after_shop_loop_item',
    ];

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void
    {
        $this->position_service = new DisplayPositionService();
        $this->register_display_hooks();
    }

    /**
     * Register display hooks based on settings
     *
     * @return void
     */
    protected function register_display_hooks(): void
    {
        if (! $this->is_enabled()) {
            return;
        }

        $show_on = $this->get('show_on', []);

        if (in_array('product_page', $show_on, true)) {
            $this->register_product_page_hook();
        }

        if (in_array('shop_category_pages', $show_on, true)) {
            $this->register_shop_page_hook();
        }
    }

    /**
     * Register product page position hook
     *
     * @return void
     */
    protected function register_product_page_hook(): void
    {
        $position = $this->get('position_on_product_page');

        $this->position_service->register_hook(
            DisplayPositionService::PAGE_PRODUCT,
            $position,
            [$this, 'render_stock_scarcity_template']
        );
    }

    /**
     * Register shop/category page position hook
     *
     * @return void
     */
    protected function register_shop_page_hook(): void
    {

        $position = $this->get('position_on_product_page');

        $mapped_positions = array(
            'below_product_title' => 'after_shop_loop_item_title',
            'below_add_to_cart_button' => 'after_shop_loop_item',
        );

        $position = $mapped_positions[$position] ?? 'after_shop_loop_item';


        $this->position_service->register_hook(
            DisplayPositionService::PAGE_SHOP,
            $position,
            [$this, 'render_stock_scarcity_template']
        );
    }

    /**
     * Get position options for product page admin UI
     *
     * @return array Options array with value/label pairs.
     */
    public function get_product_position_options(): array
    {
        return $this->position_service->get_options_for_select(
            DisplayPositionService::PAGE_PRODUCT,
            $this->product_positions
        );
    }

    /**
     * Get position options for shop page admin UI
     *
     * @return array Options array with value/label pairs.
     */
    public function get_shop_position_options(): array
    {
        return $this->position_service->get_options_for_select(
            DisplayPositionService::PAGE_SHOP,
            $this->shop_positions
        );
    }

    /**
     * Check if stock scarcity should be displayed for current product
     *
     * @param \WC_Product|null $product Product to check
     * @return bool
     */
    protected function should_display_stock_scarcity($product): bool
    {
        if (empty($product)) {
            return false;
        }

        $settings = $this->get_settings();

        $apply_to = $settings['apply_to'] ?? 'all_products';

        $exclude_products = $settings['exclude_products'] ?? [];
        if (!empty($exclude_products) && in_array((string) $product->get_id(), $exclude_products)) {
            return false; // Product is in exclude list
        }

        switch ($apply_to) {
            case 'all_products':
                return true;
            case 'specific_categories':
                $selected_categories = $settings['specific_categories'] ?? [];

                if (empty($selected_categories)) {
                    return false;
                }

                $product_category_ids = wp_get_post_terms($product->get_id(), 'product_cat', ['fields' => 'ids']);

                if (empty($product_category_ids) || is_wp_error($product_category_ids)) {
                    return false;
                }

                // Build list of all category IDs to match (selected + all their descendants)
                $categories_to_match = [];
                foreach ($selected_categories as $category_slug) {
                    $term = get_term_by('slug', $category_slug, 'product_cat');
                    if ($term) {
                        $categories_to_match[] = $term->term_id;
                        // Add all children (descendants) of this category
                        $children = get_term_children($term->term_id, 'product_cat');
                        if (!empty($children) && !is_wp_error($children)) {
                            $categories_to_match = array_merge($categories_to_match, $children);
                        }
                    }
                }

                return !empty(array_intersect($product_category_ids, $categories_to_match));
            case 'specific_products':
                $selected_products = $settings['specific_products'] ?? [];

                if (empty($selected_products)) {
                    return false;
                }

                return in_array((string) $product->get_id(), $selected_products);

            default:
                return false;
        }
    }

    public function render_stock_scarcity_template($current_product = null): void
    {

        if ( ! $this->is_enabled() ) {
            return;
        }

        global $product;

        if (empty($current_product) && !empty($product)) {
            $current_product = $product;
        }

        if (empty($current_product)) {
            return;
        }

        // Check if should display for this product
        if (!$this->should_display_stock_scarcity($current_product)) {
            return;
        }

        $args = array(
            'product' => $current_product,
            'settings' => $this->get_settings(),
            'default_settings' => $this->get_default_settings(),
        );

        $path = YAYBOOST_PATH . 'includes/Features/StockScarcity/templates/stock-scarcity.php';

        if (file_exists($path)) {
            // Track impression
            $this->track_impression( $current_product );

            include $path;
        }
    }

    /**
     * Track impression for analytics
     *
     * @param \WC_Product $product Product being displayed.
     * @return void
     */
    private function track_impression( $product ): void {
        // Don't track in admin
        if ( is_admin() && ! wp_doing_ajax() ) {
            return;
        }

        $stock_quantity = $product->get_stock_quantity();
        $settings       = $this->get_settings();

        AnalyticsTracker::impression(
            AnalyticsTracker::FEATURE_STOCK_SCARCITY,
            $product->get_id(),
            [
                'stock_quantity'      => $stock_quantity,
                'low_stock_threshold' => $settings['low_stock_threshold'] ?? 10,
                'is_urgent'           => $stock_quantity <= ( $settings['urgent_threshold'] ?? 5 ),
            ]
        );
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
                'enabled' => true,
                'low_stock_threshold' => 10,
                'show_alert_text' => true,
                'show_progress_bar' => true,
                'default_message' => '🔥 Only {stock} left in stock!',
                'urgent_threshold' => 5,
                'urgent_message' => '⚠️ Hurry! Only {stock} left!',
                'fixed_stock_number' => [
                    'is_enabled' => false,
                    'number' => 50,
                ],
                'fill_color' => '#E53935',
                'background_color' => '#EEEEEE',
                'position_on_product_page' => 'below_product_title',
                'show_on' => ['product_page', 'shop_category_pages'],
                'apply_to' => 'all_products',
                'specific_categories' => [],
                'specific_products' => [],
                'exclude_products' => [],
            ]
        );
    }
}
