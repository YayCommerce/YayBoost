<?php
/**
 * Cache Utility
 *
 * Simple caching utility using WordPress transients with callback support.
 *
 * @package YayBoost
 */

namespace YayBoost\Utils;

/**
 * Cache utility class with remember pattern
 *
 * Usage:
 *   $value = Cache::remember('my_key', 300, function() {
 *       return expensive_operation();
 *   });
 */
class Cache {

    /**
     * Cache key prefix
     */
    const PREFIX = 'yayboost_';

    /**
     * Get cached value or execute callback and cache result
     *
     * @param string   $key        Cache key (will be prefixed).
     * @param int      $ttl        Time to live in seconds.
     * @param callable $callback   Callback to execute if cache miss.
     * @return mixed Cached or fresh value.
     */
    public static function remember( string $key, int $ttl, callable $callback ) {
        $prefixed_key = self::PREFIX . $key;
        $cached       = get_transient( $prefixed_key );

        if ( false !== $cached ) {
            return $cached;
        }

        $value = $callback();
        set_transient( $prefixed_key, $value, $ttl );

        return $value;
    }

    /**
     * Get cached value
     *
     * @param string $key     Cache key.
     * @param mixed  $default Default value if not found.
     * @return mixed Cached value or default.
     */
    public static function get( string $key, $default = null ) {
        $cached = get_transient( self::PREFIX . $key );
        return false !== $cached ? $cached : $default;
    }

    /**
     * Set cache value
     *
     * @param string $key   Cache key.
     * @param mixed  $value Value to cache.
     * @param int    $ttl   Time to live in seconds.
     * @return bool True if set successfully.
     */
    public static function set( string $key, $value, int $ttl = 0 ): bool {
        return set_transient( self::PREFIX . $key, $value, $ttl );
    }

    /**
     * Delete cached value
     *
     * @param string $key Cache key.
     * @return bool True if deleted.
     */
    public static function forget( string $key ): bool {
        return delete_transient( self::PREFIX . $key );
    }

    /**
     * Check if key exists in cache
     *
     * @param string $key Cache key.
     * @return bool True if exists.
     */
    public static function has( string $key ): bool {
        return false !== get_transient( self::PREFIX . $key );
    }
}
