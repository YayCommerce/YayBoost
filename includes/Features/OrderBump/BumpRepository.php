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

/**
 * Repository for order bump entities
 */
class BumpRepository extends EntityRepository {
    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct( 'order_bump', 'bump' );
    }
}
