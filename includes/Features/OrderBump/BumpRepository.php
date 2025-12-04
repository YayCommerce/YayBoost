<?php
/**
 * Bump Repository
 *
 * Repository for managing order bump entities.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\OrderBump;

use YayBoost\Repository\EntityRepository;

/**
 * Repository for order bump entities
 */
class BumpRepository extends EntityRepository {
    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct('order_bump', 'bump');
    }

    /**
     * Get bumps by trigger product
     *
     * @param int $product_id
     * @return array
     */
    public function get_by_trigger_product(int $product_id): array {
        $all_active = $this->get_active();

        return array_filter($all_active, function($bump) use ($product_id) {
            $settings = $bump['settings'] ?? [];
            $trigger_type = $settings['trigger_type'] ?? 'all';

            if ($trigger_type === 'all') {
                return true;
            }

            if ($trigger_type === 'specific_products') {
                $trigger_products = $settings['trigger_products'] ?? [];
                return in_array($product_id, $trigger_products, true);
            }

            return false;
        });
    }

    /**
     * Get bumps by trigger category
     *
     * @param int $category_id
     * @return array
     */
    public function get_by_trigger_category(int $category_id): array {
        $all_active = $this->get_active();

        return array_filter($all_active, function($bump) use ($category_id) {
            $settings = $bump['settings'] ?? [];
            $trigger_type = $settings['trigger_type'] ?? 'all';

            if ($trigger_type === 'all') {
                return true;
            }

            if ($trigger_type === 'specific_categories') {
                $trigger_categories = $settings['trigger_categories'] ?? [];
                return in_array($category_id, $trigger_categories, true);
            }

            return false;
        });
    }

    /**
     * Get bumps applicable for cart total
     *
     * @param float $cart_total
     * @return array
     */
    public function get_by_cart_total(float $cart_total): array {
        $all_active = $this->get_active();

        return array_filter($all_active, function($bump) use ($cart_total) {
            $settings = $bump['settings'] ?? [];
            $trigger_type = $settings['trigger_type'] ?? 'all';

            if ($trigger_type === 'all') {
                return true;
            }

            if ($trigger_type === 'cart_total') {
                $min_total = (float) ($settings['min_cart_total'] ?? 0);
                return $cart_total >= $min_total;
            }

            return false;
        });
    }

    /**
     * Get active bumps for current cart
     *
     * @param array $cart_product_ids
     * @param float $cart_total
     * @return array
     */
    public function get_active_for_cart(array $cart_product_ids, float $cart_total): array {
        $all_active = $this->get_active();
        $applicable = [];

        foreach ($all_active as $bump) {
            $settings = $bump['settings'] ?? [];
            $bump_product_id = $settings['product_id'] ?? 0;

            // Skip if bump product is already in cart
            if (in_array($bump_product_id, $cart_product_ids, true)) {
                continue;
            }

            $trigger_type = $settings['trigger_type'] ?? 'all';

            switch ($trigger_type) {
                case 'all':
                    $applicable[] = $bump;
                    break;

                case 'specific_products':
                    $trigger_products = $settings['trigger_products'] ?? [];
                    if (!empty(array_intersect($trigger_products, $cart_product_ids))) {
                        $applicable[] = $bump;
                    }
                    break;

                case 'specific_categories':
                    $trigger_categories = $settings['trigger_categories'] ?? [];
                    foreach ($cart_product_ids as $product_id) {
                        $product_cats = wp_get_post_terms($product_id, 'product_cat', ['fields' => 'ids']);
                        if (!empty(array_intersect($trigger_categories, $product_cats))) {
                            $applicable[] = $bump;
                            break;
                        }
                    }
                    break;

                case 'cart_total':
                    $min_total = (float) ($settings['min_cart_total'] ?? 0);
                    if ($cart_total >= $min_total) {
                        $applicable[] = $bump;
                    }
                    break;
            }
        }

        // Sort by priority
        usort($applicable, function($a, $b) {
            return ($a['priority'] ?? 10) - ($b['priority'] ?? 10);
        });

        return $applicable;
    }

    /**
     * Get bump statistics
     *
     * @param int $bump_id
     * @return array
     */
    public function get_stats(int $bump_id): array {
        // This would be enhanced with actual tracking in the future
        return [
            'views'       => 0,
            'conversions' => 0,
            'revenue'     => 0,
        ];
    }
}
