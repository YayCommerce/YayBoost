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
     * Feature category
     *
     * @var string
     */
    protected $category = 'cart_optimizer';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'lightning';

    /**
     * Display priority (lower = higher priority)
     *
     * @var int
     */
    protected $priority = 10;

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
        $this->container  = $container;
        $this->optionName = 'yayboost_feature_' . $this->id;
    }

    /**
     * Get feature ID
     *
     * @return string
     */
    public function get_id(): string {
        return $this->id;
    }

    /**
     * Get feature name
     *
     * @return string
     */
    public function get_name(): string {
        return $this->name;
    }

    /**
     * Get feature description
     *
     * @return string
     */
    public function get_description(): string {
        return $this->description;
    }

    /**
     * Get feature category
     *
     * @return string
     */
    public function get_category(): string {
        return $this->category;
    }

    /**
     * Get feature icon
     *
     * @return string
     */
    public function get_icon(): string {
        return $this->icon;
    }

    /**
     * Get display priority
     *
     * @return int
     */
    public function get_priority(): int {
        return $this->priority;
    }

    /**
     * Check if feature is enabled
     *
     * @return bool
     */
    public function is_enabled(): bool {
        $settings = $this->get_settings();
        return isset( $settings['enabled'] ) && $settings['enabled'];
    }

    /**
     * Enable the feature
     *
     * @return void
     */
    public function enable(): void {
        $settings            = $this->get_settings();
        $settings['enabled'] = true;
        $this->save_settings( $settings );
    }

    /**
     * Disable the feature
     *
     * @return void
     */
    public function disable(): void {
        $settings            = $this->get_settings();
        $settings['enabled'] = false;
        $this->save_settings( $settings );
    }

    /**
     * Get feature settings
     *
     * @return array
     */
    public function get_settings(): array {
        $defaults = $this->get_default_settings();
        $settings = get_option( $this->optionName, [] );

        return array_merge( $defaults, $settings );
    }

    /**
     * Update feature settings
     *
     * @param array $settings
     * @return void
     */
    public function update_settings(array $settings): void {
        $current   = $this->get_settings();
        $sanitized = $this->sanitize_settings( $settings );
        $updated   = array_merge( $current, $sanitized );
        $this->save_settings( $updated );
    }

    /**
     * Sanitize settings before saving
     *
     * @param array $settings
     * @return array
     */
    protected function sanitize_settings(array $settings): array {
        return $this->sanitize_array_recursive( $settings );
    }

    /**
     * Recursively sanitize array values
     *
     * @param array $data
     * @return array
     */
    protected function sanitize_array_recursive(array $data): array {
        $sanitized = [];

        foreach ($data as $key => $value) {
            $key = sanitize_key( $key );

            if (is_array( $value )) {
                $sanitized[ $key ] = $this->sanitize_array_recursive( $value );
            } elseif (is_bool( $value )) {
                $sanitized[ $key ] = $value;
            } elseif (is_int( $value )) {
                $sanitized[ $key ] = (int) $value;
            } elseif (is_float( $value )) {
                $sanitized[ $key ] = (float) $value;
            } else {
                $sanitized[ $key ] = sanitize_text_field( (string) $value );
            }
        }

        return $sanitized;
    }

    /**
     * Save feature settings
     *
     * @param array $settings
     * @return void
     */
    protected function save_settings(array $settings): void {
        update_option( $this->optionName, $settings );
    }

    /**
     * Get default settings
     *
     * @return array
     */
    protected function get_default_settings(): array {
        return [
            'enabled' => false,
        ];
    }

    /**
     * Convert feature to array for REST API response
     *
     * @return array
     */
    public function to_array(): array {
        return [
            'id'          => $this->get_id(),
            'name'        => $this->get_name(),
            'description' => $this->get_description(),
            'category'    => $this->get_category(),
            'icon'        => $this->get_icon(),
            'priority'    => $this->get_priority(),
            'enabled'     => $this->is_enabled(),
            'settings'    => $this->get_settings(),
        ];
    }

    /**
     * Initialize the feature (must be implemented by child classes)
     *
     * @return void
     */
    abstract public function init(): void;

    public function get(string $key, $default = null) {
        $settings = $this->get_settings();
        $keys = explode('.', $key);
        $value = $settings;

        foreach ($keys as $k) {
            if (!isset($value[$k])) {
                return $default;
            }
            $value = $value[$k];
        }

        return $value;
    }
}
