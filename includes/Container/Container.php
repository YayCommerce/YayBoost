<?php
/**
 * Dependency Injection Container
 *
 * @package YayBoost
 */

namespace YayBoost\Container;

use Exception;

/**
 * Simple DI Container for managing dependencies
 */
class Container {
    /**
     * Registered services
     *
     * @var array
     */
    protected $services = [];

    /**
     * Resolved instances (singletons)
     *
     * @var array
     */
    protected $instances = [];

    /**
     * Register a service
     *
     * @param string $key Service identifier
     * @param callable|object $resolver Service resolver or instance
     * @param bool $singleton Whether to return the same instance
     * @return void
     */
    public function register($key, $resolver, $singleton = true) {
        $this->services[$key] = [
            'resolver' => $resolver,
            'singleton' => $singleton,
        ];
    }

    /**
     * Resolve a service
     *
     * @param string $key Service identifier
     * @return mixed
     * @throws Exception If service not found
     */
    public function resolve($key) {
        if (!$this->has($key)) {
            throw new Exception("Service '{$key}' not found in container.");
        }

        // Return existing instance if singleton
        if ($this->services[$key]['singleton'] && isset($this->instances[$key])) {
            return $this->instances[$key];
        }

        $resolver = $this->services[$key]['resolver'];

        // If resolver is already an instance, return it
        if (!is_callable($resolver)) {
            return $resolver;
        }

        // Call the resolver to create instance
        $instance = $resolver($this);

        // Store instance if singleton
        if ($this->services[$key]['singleton']) {
            $this->instances[$key] = $instance;
        }

        return $instance;
    }

    /**
     * Check if service exists
     *
     * @param string $key Service identifier
     * @return bool
     */
    public function has($key) {
        return isset($this->services[$key]);
    }

    /**
     * Set an instance directly
     *
     * @param string $key Service identifier
     * @param mixed $instance Service instance
     * @return void
     */
    public function instance($key, $instance) {
        $this->instances[$key] = $instance;
        $this->register($key, $instance, true);
    }

    /**
     * Make a new instance (bypass singleton)
     *
     * @param string $key Service identifier
     * @return mixed
     * @throws Exception If service not found
     */
    public function make($key) {
        if (!$this->has($key)) {
            throw new Exception("Service '{$key}' not found in container.");
        }

        $resolver = $this->services[$key]['resolver'];

        if (!is_callable($resolver)) {
            return $resolver;
        }

        return $resolver($this);
    }
}

