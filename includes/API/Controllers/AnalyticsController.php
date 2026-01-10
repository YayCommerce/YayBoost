<?php
/**
 * Analytics REST API Controller
 *
 * Provides endpoints for dashboard analytics data.
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;
use YayBoost\Analytics\AnalyticsDailyTable;

/**
 * Handles analytics API endpoints
 */
class AnalyticsController extends BaseController {
    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes(): void {
        // Get dashboard stats overview
        $this->register_route(
            '/analytics/dashboard',
            WP_REST_Server::READABLE,
            [ $this, 'get_dashboard_stats' ]
        );

        // Get stats for a specific feature
        $this->register_route(
            '/analytics/features/(?P<feature_id>[a-zA-Z0-9_-]+)',
            WP_REST_Server::READABLE,
            [ $this, 'get_feature_stats' ]
        );

        // Get all features stats summary
        $this->register_route(
            '/analytics/features',
            WP_REST_Server::READABLE,
            [ $this, 'get_all_features_stats' ]
        );
    }

    /**
     * Get dashboard stats overview
     *
     * Returns aggregated stats for all features for the dashboard.
     *
     * @param WP_REST_Request $request Request object
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_dashboard_stats( WP_REST_Request $request ) {
        $period = $request->get_param( 'period' ) ?: '7d';
        $dates  = $this->get_date_range( $period );

        // Get totals for all features
        $features_stats = AnalyticsDailyTable::get_all_features_totals(
            $dates['start'],
            $dates['end']
        );

        // Calculate grand totals
        $grand_totals = [
            'impressions'   => 0,
            'clicks'        => 0,
            'add_to_carts'  => 0,
            'purchases'     => 0,
            'revenue'       => 0,
        ];

        foreach ( $features_stats as $feature_id => $stats ) {
            $grand_totals['impressions']  += (int) ( $stats['total_impressions'] ?? 0 );
            $grand_totals['clicks']       += (int) ( $stats['total_clicks'] ?? 0 );
            $grand_totals['add_to_carts'] += (int) ( $stats['total_add_to_carts'] ?? 0 );
            $grand_totals['purchases']    += (int) ( $stats['total_purchases'] ?? 0 );
            $grand_totals['revenue']      += (float) ( $stats['total_revenue'] ?? 0 );
        }

        // Calculate conversion rate
        $conversion_rate = 0;
        if ( $grand_totals['impressions'] > 0 ) {
            $conversion_rate = round( ( $grand_totals['purchases'] / $grand_totals['impressions'] ) * 100, 2 );
        }

        return $this->success(
            [
                'period'          => $period,
                'date_range'      => $dates,
                'totals'          => $grand_totals,
                'conversion_rate' => $conversion_rate,
                'features'        => $features_stats,
            ]
        );
    }

    /**
     * Get stats for a specific feature
     *
     * @param WP_REST_Request $request Request object
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_feature_stats( WP_REST_Request $request ) {
        $feature_id = $request->get_param( 'feature_id' );
        $period     = $request->get_param( 'period' ) ?: '7d';
        $dates      = $this->get_date_range( $period );

        // Get daily stats
        $daily_stats = AnalyticsDailyTable::get_stats(
            $feature_id,
            $dates['start'],
            $dates['end']
        );

        // Get totals
        $totals = AnalyticsDailyTable::get_totals(
            $feature_id,
            $dates['start'],
            $dates['end']
        );

        // Calculate conversion rate
        $conversion_rate = 0;
        $impressions     = (int) ( $totals['total_impressions'] ?? 0 );
        $purchases       = (int) ( $totals['total_purchases'] ?? 0 );

        if ( $impressions > 0 ) {
            $conversion_rate = round( ( $purchases / $impressions ) * 100, 2 );
        }

        return $this->success(
            [
                'feature_id'      => $feature_id,
                'period'          => $period,
                'date_range'      => $dates,
                'totals'          => [
                    'impressions'   => $impressions,
                    'clicks'        => (int) ( $totals['total_clicks'] ?? 0 ),
                    'add_to_carts'  => (int) ( $totals['total_add_to_carts'] ?? 0 ),
                    'purchases'     => $purchases,
                    'revenue'       => (float) ( $totals['total_revenue'] ?? 0 ),
                ],
                'conversion_rate' => $conversion_rate,
                'daily'           => $daily_stats,
            ]
        );
    }

    /**
     * Get stats summary for all features
     *
     * @param WP_REST_Request $request Request object
     * @return \WP_REST_Response|\WP_Error
     */
    public function get_all_features_stats( WP_REST_Request $request ) {
        $period = $request->get_param( 'period' ) ?: '7d';
        $dates  = $this->get_date_range( $period );

        $features_stats = AnalyticsDailyTable::get_all_features_totals(
            $dates['start'],
            $dates['end']
        );

        // Format and add conversion rates
        $formatted = [];
        foreach ( $features_stats as $feature_id => $stats ) {
            $impressions     = (int) ( $stats['total_impressions'] ?? 0 );
            $purchases       = (int) ( $stats['total_purchases'] ?? 0 );
            $conversion_rate = 0;

            if ( $impressions > 0 ) {
                $conversion_rate = round( ( $purchases / $impressions ) * 100, 2 );
            }

            $formatted[ $feature_id ] = [
                'impressions'     => $impressions,
                'clicks'          => (int) ( $stats['total_clicks'] ?? 0 ),
                'add_to_carts'    => (int) ( $stats['total_add_to_carts'] ?? 0 ),
                'purchases'       => $purchases,
                'revenue'         => (float) ( $stats['total_revenue'] ?? 0 ),
                'conversion_rate' => $conversion_rate,
            ];
        }

        return $this->success(
            [
                'period'     => $period,
                'date_range' => $dates,
                'features'   => $formatted,
            ]
        );
    }

    /**
     * Get date range from period string
     *
     * @param string $period Period string (7d, 30d, 90d, etc.)
     * @return array Start and end dates
     */
    private function get_date_range( string $period ): array {
        $end_date = current_time( 'Y-m-d' );

        switch ( $period ) {
            case '1d':
            case 'today':
                $start_date = $end_date;
                break;
            case '7d':
                $start_date = gmdate( 'Y-m-d', strtotime( '-6 days' ) );
                break;
            case '30d':
                $start_date = gmdate( 'Y-m-d', strtotime( '-29 days' ) );
                break;
            case '90d':
                $start_date = gmdate( 'Y-m-d', strtotime( '-89 days' ) );
                break;
            case 'all':
                $start_date = '2020-01-01'; // Reasonable start
                break;
            default:
                // Try to parse as days
                if ( preg_match( '/^(\d+)d$/', $period, $matches ) ) {
                    $days       = (int) $matches[1] - 1;
                    $start_date = gmdate( 'Y-m-d', strtotime( "-{$days} days" ) );
                } else {
                    $start_date = gmdate( 'Y-m-d', strtotime( '-6 days' ) );
                }
        }

        return [
            'start' => $start_date,
            'end'   => $end_date,
        ];
    }
}
