<?php
/**
 * Container Aware Interface
 *
 * @package YayBoost
 */

namespace YayBoost\Container;

/**
 * Interface for classes that need container access
 */
interface ContainerAwareInterface {
    /**
     * Set the container instance
     *
     * @param Container $container
     * @return void
     */
    public function set_container(Container $container);

    /**
     * Get the container instance
     *
     * @return Container
     */
    public function get_container();
}
