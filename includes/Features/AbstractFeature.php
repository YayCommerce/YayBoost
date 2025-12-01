<?php
/**
 * Abstract Feature Base Class
 *
 * @package YayBoost
 */

namespace YayBoost\Features;

use YayBoost\Container\Container;
use YayBoost\Interfaces\FeatureInterface;

/**
 * Base class for all features
 */
abstract class AbstractFeature implements FeatureInterface {
    /**
     * Container instance
     *
     * @var Container
     */
    protected $container;

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id;

    /**
     * Feature name
     *
     * @var string
     */
    protected $name;

    /**
     * Feature description
     *
     * @var string
     */
    protected $description;

    /**
     * Settings option name
     *
     * @var string
     */
    protected $optionName;

    /**
     * Constructor
     *
     * @param Container $container
     */
    public function __construct(Container $container) {
        $this->container = $container;
        $this->optionName = 'yayboost_feature_' . $this->id;
    }

    /**
     * Get feature ID
     *
     * @return string
     */
    public function get_id() {
        return $this->id;
    }

    /**
     * Get feature name
     *
     * @return string
     */
    public function get_name() {
        return $this->name;
    }

    /**
     * Get feature description
     *
     * @return string
     */
    public function get_description() {
        return $this->description;
    }

    /**
     * Check if feature is enabled
     *
     * @return bool
     */
    public function is_enabled() {
        $settings = $this->get_settings();
        return isset($settings['enabled']) && $settings['enabled'];
    }

    /**
     * Enable the feature
     *
     * @return void
     */
    public function enable() {
        $settings = $this->get_settings();
        $settings['enabled'] = true;
        $this->save_settings($settings);
    }

    /**
     * Disable the feature
     *
     * @return void
     */
    public function disable() {
        $settings = $this->get_settings();
        $settings['enabled'] = false;
        $this->save_settings($settings);
    }

    /**
     * Get feature settings
     *
     * @return array
     */
    public function get_settings() {
        $defaults = $this->get_default_settings();
        $settings = get_option($this->optionName, []);

        return array_merge($defaults, $settings);
    }

    /**
     * Update feature settings
     *
     * @param array $settings
     * @return void
     */
    public function update_settings($settings) {
        $current = $this->get_settings();
        $updated = array_merge($current, $settings);
        $this->save_settings($updated);
    }

    /**
     * Save feature settings
     *
     * @param array $settings
     * @return void
     */
    protected function save_settings($settings) {
        update_option($this->optionName, $settings);
    }

    /**
     * Get default settings
     *
     * @return array
     */
    protected function get_default_settings() {
        return [
            'enabled' => false,
        ];
    }

    /**
     * Initialize the feature (must be implemented by child classes)
     *
     * @return void
     */
    abstract public function init();
}

