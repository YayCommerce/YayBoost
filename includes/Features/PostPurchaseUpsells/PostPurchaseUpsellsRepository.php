<?php
/**
 * Post Purchase Upsells Repository
 *
 * Repository for managing post purchase upsells entities.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\PostPurchaseUpsells;

use YayBoost\Repository\EntityRepository;
use YayBoost\Utils\Cache;
/**
 * Repository for post purchase upsells entities
 */
class PostPurchaseUpsellsRepository extends EntityRepository {
    /**
     * Cache TTL in seconds
     */
    const CACHE_TTL = 30;

    /**
     * Cache key prefix for active post purchase upsells
     */
    const CACHE_KEY_PREFIX = 'ppus_active';

    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct( 'post_purchase_upsells', 'purchase' );
    }

    public function get_active(): array {
        return Cache::remember(
            self::CACHE_KEY_PREFIX,
            self::CACHE_TTL,
            fn() => $this->get_all( [ 'status' => 'active' ] )
        );
    }
}
