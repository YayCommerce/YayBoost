<?php
namespace YayBoost\Traits;

trait Singleton {
    /**
     * Array of instances for each class using this trait
     *
     * @var array
     */
    private static $instances = [];

    protected function __construct() { }

    /**
     * Get singleton instance
     *
     * @param mixed ...$args Constructor arguments.
     * @return static
     */
    public static function get_instance( ...$args ) {
        $class = get_called_class();
        if ( ! isset( self::$instances[ $class ] ) ) {
            self::$instances[ $class ] = new $class( ...$args );
        }

        return self::$instances[ $class ];
    }

    /** Singletons should not be cloneable. */
    protected function __clone() { }

    /** Singletons should not be restorable from strings. */
    public function __wakeup() {
        throw new \Exception( 'Cannot unserialize a singleton.' );
    }
}
