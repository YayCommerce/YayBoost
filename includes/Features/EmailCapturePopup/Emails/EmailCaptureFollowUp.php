<?php
/**
 * Email Capture Follow-Up Email (WC_Email)
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup\Emails;

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'WC_Email' ) ) {
    return;
}

/**
 * Follow-up email sent to captured guest emails
 */
class EmailCaptureFollowUp extends \WC_Email {

    /**
     * Constructor
     */
    public function __construct() {
        $this->id             = 'yayboost_email_capture_followup';
        $this->title          = __( 'Email Capture Follow-up', 'yayboost' );
        $this->description    = __( 'Follow-up email sent to guests who captured their email via the popup.', 'yayboost' );
        $this->customer_email = true;
        $this->template_html  = 'emails/email-capture-followup.php';
        $this->template_plain = 'emails/plain/email-capture-followup.php';
        $this->template_base  = YAYBOOST_PATH . 'includes/Features/EmailCapturePopup/templates/';

        parent::__construct();
    }

    /**
     * Get default subject
     *
     * @return string
     */
    public function get_default_subject(): string {
        $feature = $this->get_feature_instance();
        if ( $feature ) {
            $settings      = $feature->get_settings();
            $email_trigger = $settings['email_trigger'] ?? [];
            return $email_trigger['subject'] ?? __( "You're almost there! Complete your account or start shopping", 'yayboost' );
        }
        return __( "You're almost there! Complete your account or start shopping", 'yayboost' );
    }

    /**
     * Get default heading
     *
     * @return string
     */
    public function get_default_heading(): string {
        $feature = $this->get_feature_instance();
        if ( $feature ) {
            $settings      = $feature->get_settings();
            $email_trigger = $settings['email_trigger'] ?? [];
            return $email_trigger['email_heading'] ?? __( 'Welcome aboard!', 'yayboost' );
        }
        return __( 'Welcome aboard!', 'yayboost' );
    }

    /**
     * Get feature instance from container
     *
     * @return \YayBoost\Features\EmailCapturePopup\EmailCapturePopupFeature|null
     */
    private function get_feature_instance() {
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

    /**
     * Trigger the email with custom subject, heading, and content
     *
     * @param string $recipient  Recipient email.
     * @param string $subject    Email subject.
     * @param string $heading    Email heading.
     * @param string $content    Email body content (HTML allowed).
     * @return void
     */
    public function trigger( string $recipient, string $subject, string $heading, string $content ): void {
        $this->setup_locale();

        $this->recipient = $recipient;
        $this->subject   = $subject;
        $this->heading   = $heading;
        $this->object    = [
            'email_content' => $content,
        ];

        // Send programmatically - no need to check WC email "enabled" setting
        if ( $this->get_recipient() ) {
            $this->send( $this->get_recipient(), $this->get_subject(), $this->get_content(), $this->get_headers(), $this->get_attachments() );
        }

        $this->restore_locale();
    }

    /**
     * Get content html
     *
     * @return string
     */
    public function get_content_html(): string {
        $email_content = is_array( $this->object ) && isset( $this->object['email_content'] )
            ? $this->object['email_content']
            : '';

        ob_start();
        wc_get_template(
            $this->template_html,
            [
                'email'              => $this,
                'email_heading'      => $this->get_heading(),
                'email_content'      => $email_content,
                'additional_content' => $this->get_additional_content(),
                'sent_to_admin'      => false,
                'plain_text'         => false,
            ],
            'yayboost',
            $this->template_base
        );

        return ob_get_clean();
    }

    /**
     * Get content plain
     *
     * @return string
     */
    public function get_content_plain(): string {
        $email_content = is_array( $this->object ) && isset( $this->object['email_content'] )
            ? $this->object['email_content']
            : '';
        $email_content = wp_strip_all_tags( $email_content );

        ob_start();
        wc_get_template(
            $this->template_plain,
            [
                'email'         => $this,
                'email_heading' => $this->get_heading(),
                'email_content' => $email_content,
                'sent_to_admin' => false,
                'plain_text'    => true,
            ],
            'yayboost',
            $this->template_base
        );

        return ob_get_clean();
    }
}
