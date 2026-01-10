<?php
/**
 * Dashboard REST API Controller
 *
 * Handles dashboard-related API endpoints including onboarding.
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;
use YayBoost\Analytics\AnalyticsDailyTable;

/**
 * Handles dashboard API endpoints
 */
class DashboardController extends BaseController {
    /**
     * Option key for dismissed onboarding
     */
    const ONBOARDING_DISMISSED_OPTION = 'yayboost_onboarding_dismissed';

    /**
     * Option key for FBT backfill completed
     */
    const FBT_BACKFILL_OPTION = 'yayboost_fbt_backfill_completed';

    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes(): void {
        // Get onboarding status
        $this->register_route(
            '/dashboard/onboarding',
            WP_REST_Server::READABLE,
            [ $this, 'get_onboarding_status' ]
        );

        // Dismiss onboarding
        $this->register_route(
            '/dashboard/onboarding/dismiss',
            WP_REST_Server::CREATABLE,
            [ $this, 'dismiss_onboarding' ]
        );

        // Get feature health status
        $this->register_route(
            '/dashboard/health',
            WP_REST_Server::READABLE,
            [ $this, 'get_feature_health' ]
        );
    }

    /**
     * Get feature health status for all features
     *
     * Health indicators:
     * - green: Enabled + has impressions in last 7 days
     * - yellow: Enabled but no impressions in 7 days
     * - gray: Disabled
     *
     * @param WP_REST_Request $request Request object.
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_feature_health( WP_REST_Request $request ) {
        $registry = $this->container->resolve( 'feature.registry' );
        $features = $registry->get_all_sorted();

        // Get analytics for last 7 days
        $end_date   = gmdate( 'Y-m-d' );
        $start_date = gmdate( 'Y-m-d', strtotime( '-6 days' ) );
        $analytics  = AnalyticsDailyTable::get_all_features_totals( $start_date, $end_date );

        // Map feature IDs to analytics keys
        $feature_analytics_map = [
            'frequently_bought_together' => 'fbt',
            'free_shipping_bar'          => 'free_shipping_bar',
            'stock_scarcity'             => 'stock_scarcity',
            'next_order_coupon'          => 'next_order_coupon',
            'smart_recommendations'      => 'smart_recommendations',
            'order_bump'                 => 'order_bump',
        ];

        $health_data = [];

        foreach ( $features as $feature ) {
            $feature_id   = $feature->get_id();
            $is_enabled   = $feature->is_enabled();
            $analytics_id = $feature_analytics_map[ $feature_id ] ?? $feature_id;

            // Get impressions for this feature
            $impressions = 0;
            if ( isset( $analytics[ $analytics_id ] ) ) {
                $impressions = (int) ( $analytics[ $analytics_id ]['total_impressions'] ?? 0 );
            }

            // Determine health status
            $health = 'gray'; // Default: disabled
            if ( $is_enabled ) {
                $health = $impressions > 0 ? 'green' : 'yellow';
            }

            $health_data[] = [
                'id'          => $feature_id,
                'name'        => $feature->get_name(),
                'icon'        => $feature->get_icon(),
                'enabled'     => $is_enabled,
                'health'      => $health,
                'impressions' => $impressions,
                'path'        => '/features/' . $feature_id,
            ];
        }

        return $this->success( [
            'features'   => $health_data,
            'date_range' => [
                'start' => $start_date,
                'end'   => $end_date,
            ],
        ] );
    }

    /**
     * Get onboarding status with step completion
     *
     * @param WP_REST_Request $request Request object.
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_onboarding_status( WP_REST_Request $request ) {
        $dismissed = get_option( self::ONBOARDING_DISMISSED_OPTION, false );

        // If dismissed, return minimal response
        if ( $dismissed ) {
            return $this->success( [
                'dismissed' => true,
                'steps'     => [],
            ] );
        }

        // Check each step completion
        $steps = $this->get_onboarding_steps();

        // Check if all steps complete
        $all_complete = array_reduce(
            $steps,
            fn( $carry, $step ) => $carry && $step['completed'],
            true
        );

        return $this->success( [
            'dismissed'    => false,
            'all_complete' => $all_complete,
            'steps'        => $steps,
        ] );
    }

    /**
     * Dismiss onboarding checklist
     *
     * @param WP_REST_Request $request Request object.
     * @return \WP_REST_Response|\WP_Error
     */
    public function dismiss_onboarding( WP_REST_Request $request ) {
        update_option( self::ONBOARDING_DISMISSED_OPTION, true );

        return $this->success( [
            'dismissed' => true,
            'message'   => __( 'Onboarding dismissed.', 'yayboost' ),
        ] );
    }

    /**
     * Get onboarding steps with completion status
     *
     * @return array
     */
    private function get_onboarding_steps(): array {
        return [
            [
                'id'          => 'enable_feature',
                'title'       => __( 'Enable at least one feature', 'yayboost' ),
                'description' => __( 'Activate a boost feature to start increasing sales.', 'yayboost' ),
                'completed'   => $this->has_enabled_feature(),
                'action'      => [
                    'label' => __( 'Go to Features', 'yayboost' ),
                    'path'  => '/features',
                ],
            ],
            [
                'id'          => 'configure_shipping',
                'title'       => __( 'Configure Free Shipping Bar', 'yayboost' ),
                'description' => __( 'Set up your free shipping threshold to encourage larger orders.', 'yayboost' ),
                'completed'   => $this->is_free_shipping_configured(),
                'action'      => [
                    'label' => __( 'Configure', 'yayboost' ),
                    'path'  => '/features/free_shipping_bar',
                ],
            ],
            [
                'id'          => 'run_backfill',
                'title'       => __( 'Run FBT historical data backfill', 'yayboost' ),
                'description' => __( 'Analyze past orders to generate product recommendations.', 'yayboost' ),
                'completed'   => $this->is_fbt_backfill_completed(),
                'action'      => [
                    'label' => __( 'Run Backfill', 'yayboost' ),
                    'path'  => '/features/frequently_bought_together',
                ],
            ],
            [
                'id'          => 'wait_analytics',
                'title'       => __( 'Wait for first analytics data', 'yayboost' ),
                'description' => __( 'Analytics will appear once customers interact with your features.', 'yayboost' ),
                'completed'   => $this->has_analytics_data(),
                'action'      => null, // No action, auto-completes
            ],
        ];
    }

    /**
     * Check if any feature is enabled
     *
     * @return bool
     */
    private function has_enabled_feature(): bool {
        $settings = get_option( 'yayboost_settings', [] );
        $features = $settings['features'] ?? [];

        foreach ( $features as $feature_settings ) {
            if ( ! empty( $feature_settings['enabled'] ) ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if Free Shipping Bar is configured
     *
     * @return bool
     */
    private function is_free_shipping_configured(): bool {
        $settings = get_option( 'yayboost_settings', [] );
        $fsb      = $settings['features']['free_shipping_bar'] ?? [];

        // Consider configured if enabled
        return ! empty( $fsb['enabled'] );
    }

    /**
     * Check if FBT backfill has been run
     *
     * @return bool
     */
    private function is_fbt_backfill_completed(): bool {
        return (bool) get_option( self::FBT_BACKFILL_OPTION, false );
    }

    /**
     * Check if there's any analytics data
     *
     * @return bool
     */
    private function has_analytics_data(): bool {
        // Check if analytics_daily table has any data
        $end_date   = gmdate( 'Y-m-d' );
        $start_date = gmdate( 'Y-m-d', strtotime( '-30 days' ) );

        $totals = AnalyticsDailyTable::get_all_features_totals( $start_date, $end_date );

        foreach ( $totals as $feature_stats ) {
            if ( ( $feature_stats['total_impressions'] ?? 0 ) > 0 ) {
                return true;
            }
        }

        return false;
    }
}
