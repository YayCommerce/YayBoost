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
    public function init(): void;

    /**
     * Get feature ID
     *
     * @return string
     */
    public function get_id(): string;

    /**
     * Get feature name
     *
     * @return string
     */
    public function get_name(): string;

    /**
     * Get feature description
     *
     * @return string
     */
    public function get_description(): string;

    /**
     * Get feature category
     *
     * @return string
     */
    public function get_category(): string;

    /**
     * Get feature icon
     *
     * @return string
     */
    public function get_icon(): string;

    /**
     * Get display priority
     *
     * @return int
     */
    public function get_priority(): int;

    /**
     * Check if feature is enabled
     *
     * @return bool
     */
    public function is_enabled(): bool;

    /**
     * Enable the feature
     *
     * @return void
     */
    public function enable(): void;

    /**
     * Disable the feature
     *
     * @return void
     */
    public function disable(): void;

    /**
     * Get feature settings
     *
     * @return array
     */
    public function get_settings(): array;

    /**
     * Update feature settings
     *
     * @param array $settings
     * @return void
     */
    public function update_settings(array $settings): void;

    /**
     * Convert feature to array for REST API
     *
     * @return array
     */
    public function to_array(): array;
}
