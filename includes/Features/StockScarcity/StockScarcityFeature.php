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
        $settings = $this->get_settings();
        add_action('woocommerce_after_shop_loop_item', [$this, 'render_stock_scarcity_template'], 11);
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

        $settings = $this->get_settings();

        $path = YAYBOOST_PATH . 'includes/Features/StockScarcity/templates/stock-scarcity.php';

        if (file_exists($path)) {
            include $path;
        }
    }
}
