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
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void
    {
        $this->render_stock_scarcity();
    }

    public function render_stock_scarcity(): void
    {

        if (! $this->is_enabled()) {
            return;
        }

        $show_on = $this->get('show_on', []);

        // Hook for product page based on position
        if (in_array('product_page', $show_on)) {
            $this->render_stock_scarcity_product_page();
        }

        // Hook for shop/category pages
        if (in_array('shop_category_pages', $show_on)) {
            $this->render_stock_scarcity_shop_category_pages();
        }
    }

    protected function render_stock_scarcity_product_page(): void
    {
        $position = $this->get('position_on_product_page');

        switch ($position) {
            case 'below_title':
                add_action('woocommerce_single_product_summary', [$this, 'render_stock_scarcity_template'], 6);
                break;
            case 'below_price':
                add_action('woocommerce_single_product_summary', [$this, 'render_stock_scarcity_template'], 11);
                break;
            default:
                add_action('woocommerce_after_add_to_cart_button', [$this, 'render_stock_scarcity_template']);
                break;
        }
    }

    protected function render_stock_scarcity_shop_category_pages(): void
    {
        add_action('woocommerce_after_shop_loop_item', [$this, 'render_stock_scarcity_template'], 11);
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
            include $path;
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
                'position_on_product_page' => 'below_title',
                'show_on' => ['product_page', 'shop_category_pages'],
                'apply_to' => 'all_products',
                'specific_categories' => [],
                'specific_products' => [],
                'exclude_products' => [],
            ]
        );
    }
}
