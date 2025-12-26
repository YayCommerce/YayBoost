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
        $settings = $this->get_settings();

        if (empty($settings['enabled'])) {
            return;
        }

        $show_on = $settings['show_on'] ?? [];

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
        $settings = $this->get_settings();
        $position = $settings['position_on_product_page'] ?? 'below_title';

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

                $product_categories = wp_get_post_terms($product->get_id(), 'product_cat', ['fields' => 'slugs']);
                $has_matching_category = !empty(array_intersect($selected_categories, $product_categories));

                return $has_matching_category;
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

        $settings = $this->get_settings();

        $path = YAYBOOST_PATH . 'includes/Features/StockScarcity/templates/stock-scarcity.php';

        if (file_exists($path)) {
            include $path;
        }
    }
}
