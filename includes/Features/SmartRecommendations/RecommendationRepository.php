<?php
/**
 * Recommendation Repository
 *
 * Handle database operations for recommendation rules
 *
 * @package YayBoost
 */

namespace YayBoost\Features\SmartRecommendations;

use YayBoost\Repository\EntityRepository;

/**
 * Repository for managing recommendation rules
 */
class RecommendationRepository extends EntityRepository {

    /**
     * Constructor
     */
    public function __construct() {
        parent::__construct( 'smart_recommendations', 'recommendation' );
    }

    /**
     * Get all active recommendation rules
     *
     * @return array Active rules
     */
    public function get_active_rules(): array {
        global $wpdb;

        $results = $wpdb->get_results(
            $wpdb->prepare(
                "SELECT * FROM {$this->get_table()} 
                WHERE feature_id = %s 
                AND entity_type = %s 
                AND status = 'active'
                ORDER BY priority ASC, id ASC",
                $this->feature_id,
                $this->entity_type
            ),
            ARRAY_A
        );

        if ( ! $results ) {
            return [];
        }

        // Decode settings JSON
        foreach ( $results as &$result ) {
            if ( ! empty( $result['settings'] )) {
                $result['settings'] = json_decode( $result['settings'], true );
            }
        }

        return $results;
    }
}
