<?php
/**
 * Email Capture REST API Controller
 *
 * @package YayBoost
 */

namespace YayBoost\API\Controllers;

use WP_REST_Request;
use WP_REST_Server;
use YayBoost\Features\EmailCapturePopup\EmailCaptureRepository;
use YayBoost\Features\EmailCapturePopup\EmailCaptureCron;
use YayBoost\Features\EmailCapturePopup\Emails\EmailCaptureFollowUp;

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

        // Manually send follow-up to a specific captured email
        $this->register_route(
            '/email-capture/send',
            WP_REST_Server::CREATABLE,
            [ $this, 'send_followup' ],
            [
                'args' => [
                    'id' => [
                        'type'     => 'integer',
                        'required' => true,
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
     * Manually send follow-up email
     *
     * @param WP_REST_Request $request
     * @return \WP_REST_Response|\WP_Error
     */
    public function send_followup( WP_REST_Request $request ) {
        $id = (int) $request->get_param( 'id' );
        if ( $id <= 0 ) {
            return $this->error( __( 'Invalid ID.', 'yayboost' ), 400 );
        }

        $row = EmailCaptureRepository::find_by_id( $id );
        if ( ! $row ) {
            return $this->error( __( 'Email not found.', 'yayboost' ), 404 );
        }

        $feature = $this->container->resolve( 'feature.email_capture_popup' );
        if ( ! $feature->is_enabled() ) {
            return $this->error( __( 'Feature is disabled.', 'yayboost' ), 400 );
        }

        $settings      = $feature->get_settings();
        $email_trigger = $settings['email_trigger'] ?? [];
        $subject       = $email_trigger['subject'] ?? __( "You're almost there! Complete your account or start shopping", 'yayboost' );
        $heading       = $email_trigger['email_heading'] ?? __( 'Welcome aboard!', 'yayboost' );
        $content       = $email_trigger['email_content'] ?? '';

        $email_class = \WC_Emails::instance()->get_emails();
        $followup    = $email_class['yayboost_email_capture_followup'] ?? null;

        if ( ! $followup || ! ( $followup instanceof EmailCaptureFollowUp ) ) {
            return $this->error( __( 'Email template not available.', 'yayboost' ), 500 );
        }

        try {
            $followup->trigger( $row['email'], $subject, $heading, $content );
            EmailCaptureRepository::update_status( $id, EmailCaptureRepository::STATUS_SENT, current_time( 'mysql' ) );
            return $this->success( [ 'sent' => true ] );
        } catch ( \Throwable $e ) {
            EmailCaptureRepository::update_status( $id, EmailCaptureRepository::STATUS_FAILED );
            return $this->error( __( 'Failed to send email.', 'yayboost' ), 500, [ 'error' => $e->getMessage() ] );
        }
    }
}
