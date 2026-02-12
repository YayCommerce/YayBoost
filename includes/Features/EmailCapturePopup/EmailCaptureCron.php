<?php
/**
 * Email Capture Cron - Action Scheduler integration
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

defined( 'ABSPATH' ) || exit;

/**
 * Schedules and processes follow-up emails via Action Scheduler
 */
class EmailCaptureCron {

    /**
     * Action hook for sending follow-up email
     */
    const ACTION_SEND_FOLLOWUP = 'yayboost_email_capture_send_followup';

    /**
     * Action group
     */
    const GROUP = 'yayboost_email_capture';

    /**
     * Schedule a single follow-up email
     *
     * @param int    $row_id  Captured email row ID.
     * @param string $scheduled_at MySQL datetime.
     * @return int|false Action ID or false
     */
    public static function schedule( int $row_id, string $scheduled_at ) {
        if ( ! function_exists( 'as_schedule_single_action' ) ) {
            return false;
        }

        $timestamp = strtotime( $scheduled_at );
        if ( $timestamp <= time() ) {
            return false;
        }

        $action_id = as_schedule_single_action(
            $timestamp,
            self::ACTION_SEND_FOLLOWUP,
            [ 'id' => $row_id ],
            self::GROUP
        );

        return $action_id ?: false;
    }

    /**
     * Unschedule all pending follow-up actions for an email address
     *
     * @param string $email
     * @return void
     */
    public static function unschedule_by_email( string $email ): void {
        if ( ! function_exists( 'as_unschedule_action' ) ) {
            return;
        }

        $pending = EmailCaptureRepository::find_pending_by_email( $email );
        if ( ! $pending ) {
            return;
        }

        $row_id = (int) $pending['id'];
        as_unschedule_action( self::ACTION_SEND_FOLLOWUP, [ 'id' => $row_id ], self::GROUP );
    }

    /**
     * Unschedule by row ID
     *
     * @param int $row_id
     * @return void
     */
    public static function unschedule_by_id( int $row_id ): void {
        if ( ! function_exists( 'as_unschedule_action' ) ) {
            return;
        }

        as_unschedule_action( self::ACTION_SEND_FOLLOWUP, [ 'id' => $row_id ], self::GROUP );
    }

    /**
     * Register the action callback
     *
     * @return void
     */
    public static function register(): void {
        add_action( self::ACTION_SEND_FOLLOWUP, [ self::class, 'run_send' ], 10, 1 );
    }

    /**
     * Run the send action (called by Action Scheduler)
     *
     * @param int $id Captured email row ID.
     * @return void
     */
    public static function run_send( int $id ): void {
        $row = EmailCaptureRepository::find_by_id( $id );
        if ( ! $row || $row['status'] !== EmailCaptureRepository::STATUS_PENDING ) {
            return;
        }

        $feature = self::get_feature();
        if ( ! $feature || ! $feature->is_enabled() ) {
            EmailCaptureRepository::update_status( $id, EmailCaptureRepository::STATUS_SKIPPED );
            return;
        }

        $settings      = $feature->get_settings();
        $email_trigger = $settings['email_trigger'] ?? [];
        $subject       = $email_trigger['subject'] ?? __( "You're almost there! Complete your account or start shopping", 'yayboost' );
        $heading       = $email_trigger['email_heading'] ?? __( 'Welcome aboard!', 'yayboost' );
        $content       = $email_trigger['email_content'] ?? '';

        $email_class = \WC_Emails::instance()->get_emails();
        $followup    = $email_class['yayboost_email_capture_followup'] ?? null;

        if ( ! $followup || ! ( $followup instanceof \YayBoost\Features\EmailCapturePopup\Emails\EmailCaptureFollowUp ) ) {
            EmailCaptureRepository::update_status( $id, EmailCaptureRepository::STATUS_FAILED );
            return;
        }

        try {
            $followup->trigger( $row['email'], $subject, $heading, $content );
            EmailCaptureRepository::update_status( $id, EmailCaptureRepository::STATUS_SENT, current_time( 'mysql' ) );
        } catch ( \Throwable $e ) {
            EmailCaptureRepository::update_status( $id, EmailCaptureRepository::STATUS_FAILED );
        }
    }

    /**
     * Get the EmailCapturePopupFeature instance
     *
     * @return EmailCapturePopupFeature|null
     */
    private static function get_feature() {
        $container = \YayBoost\Bootstrap::get_container_static();
        if ( ! $container ) {
            return null;
        }

        try {
            return $container->resolve( 'feature.email_capture_popup' );
        } catch ( \Throwable $e ) {
            return null;
        }
    }
}
