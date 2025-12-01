<?php
/**
 * Feature Registry
 *
 * @package YayBoost
 */

namespace YayBoost\Utils;

use YayBoost\Interfaces\FeatureInterface;

/**
 * Registry for managing features
 */
class FeatureRegistry {
    /**
     * Registered features
     *
     * @var array
     */
    protected $features = [];

    /**
     * Register a feature
     *
     * @param FeatureInterface $feature
     * @return void
     */
    public function register(FeatureInterface $feature) {
        $this->features[$feature->get_id()] = $feature;
    }

    /**
     * Get a feature by ID
     *
     * @param string $id Feature ID
     * @return FeatureInterface|null
     */
    public function get($id) {
        return isset($this->features[$id]) ? $this->features[$id] : null;
    }

    /**
     * Get all features
     *
     * @return array
     */
    public function get_all() {
        return $this->features;
    }

    /**
     * Check if feature exists
     *
     * @param string $id Feature ID
     * @return bool
     */
    public function has($id) {
        return isset($this->features[$id]);
    }

    /**
     * Get enabled features
     *
     * @return array
     */
    public function get_enabled() {
        return array_filter($this->features, function($feature) {
            return $feature->is_enabled();
        });
    }

    /**
     * Get disabled features
     *
     * @return array
     */
    public function get_disabled() {
        return array_filter($this->features, function($feature) {
            return !$feature->is_enabled();
        });
    }
}

