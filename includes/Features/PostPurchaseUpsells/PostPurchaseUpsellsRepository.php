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

/**
 * Repository for post purchase upsells entities
 */
class PostPurchaseUpsellsRepository extends EntityRepository {
    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct( 'post_purchase_upsells', 'purchase' );
    }
}
