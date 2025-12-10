<?php
/**
 * Service Provider Interface
 *
 * @package YayBoost
 */

namespace YayBoost\Interfaces;

use YayBoost\Container\Container;

/**
 * Interface for service providers
 */
interface ServiceProviderInterface {
    /**
     * Register services in the container
     *
     * @param Container $container
     * @return void
     */
    public function register(Container $container);

    /**
     * Boot services after all providers registered
     *
     * @param Container $container
     * @return void
     */
    public function boot(Container $container);
}
