<?php
/**
 * Email Capture Popup Feature
 *
 * Show a popup when customers try to leave with items in cart.
 * Offer discount to complete purchase NOW. Capture emails for follow-up.
 *
 * @package YayBoost
 */

namespace YayBoost\Features\EmailCapturePopup;

use YayBoost\Features\AbstractFeature;

defined( 'ABSPATH' ) || exit;

/**
 * Email Capture Popup feature implementation
 */
class EmailCapturePopupFeature extends AbstractFeature {

    /**
     * Feature ID
     *
     * @var string
     */
    protected $id = 'email_capture_popup';

    /**
     * Feature name
     *
     * @var string
     */
    protected $name = 'Email Popup';

    /**
     * Feature description
     *
     * @var string
     */
    protected $description = 'Collect emails from guests before they leave. Stay in touch and send follow-up messages.';

    /**
     * Feature category
     *
     * @var string
     */
    protected $category = 'others';

    /**
     * Feature icon (Phosphor icon name)
     *
     * @var string
     */
    protected $icon = 'envelope-simple';

    /**
     * Display priority
     *
     * @var int
     */
    protected $priority = 3;

    /**
     * Initialize the feature
     *
     * @return void
     */
    public function init(): void {
        // TODO: Enqueue frontend assets, render popup, handle email capture
        if ( ! $this->is_enabled() ) {
            return;
        }
    }

    /**
     * Get default settings
     *
     * @return array
     */
    protected function get_default_settings(): array {
        return array_merge(
            parent::get_default_settings(),
            [
                'enabled'       => false,
                'content'       => [
                    'headline'    => \__( 'Stay in touch!', 'yayboost' ),
                    'message'     => \__( 'Enter your email to receive updates and exclusive offers.', 'yayboost' ),
                    'button_text' => \__( 'Submit email', 'yayboost' ),
                ],
                'email_trigger' => [
                    'send_after_days' => 1,
                    'subject'         => \__( 'You left something in your cart', 'yayboost' ),
                    'email_content'   => \__( 'Your cart items are still waiting for you. Complete your purchase whenever you are ready.', 'yayboost' ),
                ],
            ]
        );
    }
}
