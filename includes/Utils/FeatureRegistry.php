<?php
/**
 * Feature Registry
 *
 * @package YayBoost
 */

namespace YayBoost\Utils;

use YayBoost\Features\FeatureCategory;
use YayBoost\Interfaces\FeatureInterface;

/**
 * Registry for managing features with addon support
 */
class FeatureRegistry {
    /**
     * Registered features
     *
     * @var array<string, FeatureInterface>
     */
    protected $features = [];

    /**
     * Whether addon registration hook has been fired
     *
     * @var bool
     */
    protected $addon_hook_fired = false;

    /**
     * Register a feature
     *
     * @param FeatureInterface $feature
     * @return void
     */
    public function register(FeatureInterface $feature): void {
        $this->features[$feature->get_id()] = $feature;
    }

    /**
     * Fire addon registration hook (called once after core features registered)
     *
     * @return void
     */
    public function fire_addon_hook(): void {
        if ($this->addon_hook_fired) {
            return;
        }

        /**
         * Allow addon plugins to register their features
         *
         * @param FeatureRegistry $registry
         */
        do_action('yayboost_register_features', $this);

        $this->addon_hook_fired = true;
    }

    /**
     * Get a feature by ID
     *
     * @param string $id Feature ID
     * @return FeatureInterface|null
     */
    public function get(string $id): ?FeatureInterface {
        return $this->features[$id] ?? null;
    }

    /**
     * Get all features
     *
     * @return array<string, FeatureInterface>
     */
    public function get_all(): array {
        return $this->features;
    }

    /**
     * Get all features sorted by priority
     *
     * @return array<string, FeatureInterface>
     */
    public function get_all_sorted(): array {
        $features = $this->features;

        uasort($features, function($a, $b) {
            return $a->get_priority() - $b->get_priority();
        });

        return $features;
    }

    /**
     * Check if feature exists
     *
     * @param string $id Feature ID
     * @return bool
     */
    public function has(string $id): bool {
        return isset($this->features[$id]);
    }

    /**
     * Get enabled features
     *
     * @return array<string, FeatureInterface>
     */
    public function get_enabled(): array {
        return array_filter($this->features, function($feature) {
            return $feature->is_enabled();
        });
    }

    /**
     * Get disabled features
     *
     * @return array<string, FeatureInterface>
     */
    public function get_disabled(): array {
        return array_filter($this->features, function($feature) {
            return !$feature->is_enabled();
        });
    }

    /**
     * Get features by category
     *
     * @param string $category Category ID
     * @return array<string, FeatureInterface>
     */
    public function get_by_category(string $category): array {
        return array_filter($this->features, function($feature) use ($category) {
            return $feature->get_category() === $category;
        });
    }

    /**
     * Get all categories with features
     *
     * @return array
     */
    public function get_categories(): array {
        $base_categories = FeatureCategory::get_all();

        /**
         * Allow addon plugins to add custom categories
         *
         * @param array $categories
         */
        $categories = apply_filters('yayboost_feature_categories', $base_categories);

        // Sort by priority
        uasort($categories, function($a, $b) {
            $priority_a = $a['priority'] ?? 100;
            $priority_b = $b['priority'] ?? 100;
            return $priority_a - $priority_b;
        });

        return $categories;
    }

    /**
     * Get features grouped by category
     *
     * @return array
     */
    public function get_grouped_by_category(): array {
        $categories = $this->get_categories();
        $grouped = [];

        foreach ($categories as $category_id => $category_info) {
            $features = $this->get_by_category($category_id);

            if (!empty($features)) {
                // Sort features by priority
                uasort($features, function($a, $b) {
                    return $a->get_priority() - $b->get_priority();
                });

                $grouped[$category_id] = [
                    'info'     => $category_info,
                    'features' => $features,
                ];
            }
        }

        return $grouped;
    }

    /**
     * Get feature count
     *
     * @return int
     */
    public function count(): int {
        return count($this->features);
    }
}
