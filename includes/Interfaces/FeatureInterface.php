<?php
/**
 * Feature Interface
 *
 * @package YayBoost
 */

namespace YayBoost\Interfaces;

/**
 * Interface that all features must implement
 */
interface FeatureInterface {
    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init();

    /**
     * Get feature ID
     *
     * @return string
     */
    public function get_id();

    /**
     * Get feature name
     *
     * @return string
     */
    public function get_name();

    /**
     * Get feature description
     *
     * @return string
     */
    public function get_description();

    /**
     * Check if feature is enabled
     *
     * @return bool
     */
    public function is_enabled();

    /**
     * Enable the feature
     *
     * @return void
     */
    public function enable();

    /**
     * Disable the feature
     *
     * @return void
     */
    public function disable();
}

