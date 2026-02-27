<?php
/**
 * Bump Repository
 *
 * Repository for managing order bump entities.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\OrderBump;

use YayBoost\Repository\EntityRepository;
use YayBoost\Utils\Cache;
/**
 * Repository for order bump entities
 */
class BumpRepository extends EntityRepository {
    /**
     * Cache TTL in seconds
     */
    const CACHE_TTL = 30;

    /**
     * Cache key prefix for active bumps
     */
    const CACHE_KEY_PREFIX = 'bumps_active';

    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct( 'order_bump', 'bump' );
    }

    public function get_active(): array {
        return Cache::remember(
            self::CACHE_KEY_PREFIX,
            self::CACHE_TTL,
            fn() => $this->get_all( [ 'status' => 'active' ] )
        );
    }
}
