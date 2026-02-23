<?php
/**
 * Email Capture REST API Controller
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;
use YayBoost\Features\EmailCapturePopup\EmailCaptureCron;
use YayBoost\Features\EmailCapturePopup\EmailCaptureRepository;

/**
 * Handles email capture API endpoints
 */
class EmailCaptureController extends BaseController {

    /**
     * Register routes
     *
     * @return void
     */
    public function register_routes(): void {
        // List captured emails
        $this->register_route(
            '/email-capture',
            WP_REST_Server::READABLE,
            [ $this, 'list_emails' ],
            [
                'args' => [
                    'status'   => [
                        'type'    => 'string',
                        'default' => null,
                    ],
                    'page'     => [
                        'type'    => 'integer',
                        'default' => 1,
                    ],
                    'per_page' => [
                        'type'    => 'integer',
                        'default' => 50,
                    ],
                ],
            ]
        );

        // Schedule batch follow-up emails via Action Scheduler (async)
        $this->register_route(
            '/email-capture/send-batch',
            WP_REST_Server::CREATABLE,
            [ $this, 'send_batch' ],
            [
                'args' => [
                    'ids' => [
                        'type'     => 'array',
                        'required' => true,
                        'items'    => [ 'type' => 'integer' ],
                        'minItems' => 1,
                    ],
                ],
            ]
        );
    }

    /**
     * List captured emails
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function list_emails( WP_REST_Request $request ) {
        $status   = $request->get_param( 'status' );
        $page     = max( 1, (int) $request->get_param( 'page' ) );
        $per_page = max( 1, min( 100, (int) $request->get_param( 'per_page' ) ) );
        $offset   = ( $page - 1 ) * $per_page;

        $items = EmailCaptureRepository::get_all(
            [
                'status' => $status ?: null,
                'limit'  => $per_page,
                'offset' => $offset,
            ]
        );

        $total = EmailCaptureRepository::count( $status ?: null );

        return $this->success(
            [
                'items'       => $items,
                'total'       => $total,
                'page'        => $page,
                'per_page'    => $per_page,
                'total_pages' => (int) ceil( $total / $per_page ),
            ]
        );
    }

    /**
     * Schedule batch follow-up emails via Action Scheduler (async)
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function send_batch( WP_REST_Request $request ) {
        if ( ! function_exists( 'as_schedule_single_action' ) ) {
            return $this->error( __( 'Action Scheduler is not available.', 'yayboost' ), 500 );
        }

        $ids = array_map( 'intval', (array) $request->get_param( 'ids' ) );
        $ids = array_values( array_filter( $ids, fn( $id ) => $id > 0 ) );

        if ( empty( $ids ) ) {
            return $this->error( __( 'Invalid IDs.', 'yayboost' ), 400 );
        }

        $ids = array_slice( $ids, 0, 100 );

        $feature = $this->container->resolve( 'feature.email_capture_popup' );
        if ( ! $feature->is_enabled() ) {
            return $this->error( __( 'Feature is disabled.', 'yayboost' ), 400 );
        }

        $scheduled = 0;

        foreach ( $ids as $id ) {
            $row = EmailCaptureRepository::find_by_id( $id );
            if ( ! $row || $row['status'] !== EmailCaptureRepository::STATUS_PENDING ) {
                continue;
            }

            if ( EmailCaptureCron::schedule_immediate( $id ) ) {
                ++$scheduled;
            }
        }

        return $this->success( [ 'scheduled' => $scheduled ] );
    }
}
