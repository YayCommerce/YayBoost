<?php
/**
 * Settings Manager
 *
 * @package YayBoost
 */

namespace YayBoost\Utils;

/**
 * Manages plugin settings
 */
class Settings {
    /**
     * Option name
     *
     * @var string
     */
    const OPTION_NAME = 'yayboost_settings';

    /**
     * Get all settings
     *
     * @return array
     */
    public function get_all() {
        $defaults = $this->get_defaults();
        $settings = get_option( self::OPTION_NAME, [] );

        return array_merge( $defaults, $settings );
    }

    /**
     * Get a specific setting
     *
     * @param string $key Setting key
     * @param mixed  $default Default value
     * @return mixed
     */
    public function get($key, $default = null) {
        $settings = $this->get_all();

        return isset( $settings[ $key ] ) ? $settings[ $key ] : $default;
    }

    /**
     * Update settings
     *
     * @param array $data Settings data
     * @return bool
     */
    public function update($data) {
        $current = $this->get_all();
        $updated = array_merge( $current, $data );

        return update_option( self::OPTION_NAME, $updated );
    }

    /**
     * Update a specific setting
     *
     * @param string $key Setting key
     * @param mixed  $value Setting value
     * @return bool
     */
    public function set($key, $value) {
        return $this->update( [ $key => $value ] );
    }

    /**
     * Delete a setting
     *
     * @param string $key Setting key
     * @return bool
     */
    public function delete($key) {
        $settings = $this->get_all();

        if (isset( $settings[ $key ] )) {
            unset( $settings[ $key ] );
            return update_option( self::OPTION_NAME, $settings );
        }

        return false;
    }

    /**
     * Reset to defaults
     *
     * @return bool
     */
    public function reset() {
        return update_option( self::OPTION_NAME, $this->get_defaults() );
    }

    /**
     * Get default settings
     *
     * @return array
     */
    protected function get_defaults() {
        return [
            'features' => [],
            'general'  => [
                'enabled' => true,
            ],
        ];
    }
}
